import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PORT = process.env.PORT || 3001;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "admin-users", supabase: !!SUPABASE_URL });
});

// Consulta pública del estatus de la última orden por placa
app.get("/public/orders/by-plate/:plate", async (req, res) => {
  try {
    const raw = String(req.params.plate || "").trim();
    if (!raw || raw.length < 3) {
      return res.status(400).json({ error: "Placa inválida" });
    }
    const normalized = raw.toUpperCase();

    // Buscar posibles clientes por vehículos y por columna legacy
    const { data: vehicles, error: vehErr } = await supabase
      .from("vehicles")
      .select("id, client_id, plate, brand, model")
      .ilike("plate", `%${normalized}%`)
      .order("created_at", { ascending: false })
      .limit(10);
    if (vehErr) throw vehErr;
    const { data: clientsLegacy, error: clientErr } = await supabase
      .from("clients")
      .select(
        "id, full_name, phone, vehicle_plate, vehicle_brand, vehicle_model"
      )
      .ilike("vehicle_plate", `%${normalized}%`)
      .order("created_at", { ascending: false })
      .limit(10);
    if (clientErr) throw clientErr;

    const candidateClientIds = new Set();
    (vehicles || []).forEach((v) => {
      if (v.client_id) candidateClientIds.add(v.client_id);
    });
    (clientsLegacy || []).forEach((c) => {
      if (c.id) candidateClientIds.add(c.id);
    });

    if (candidateClientIds.size === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró cliente con esa placa" });
    }

    // Elegir cliente a mostrar: el primero con datos enriquecidos desde vehicle si existe
    let client;
    const firstVehicle = vehicles && vehicles.length ? vehicles[0] : null;
    if (firstVehicle) {
      const { data: clientRow, error: cErr } = await supabase
        .from("clients")
        .select(
          "id, full_name, phone, vehicle_plate, vehicle_brand, vehicle_model"
        )
        .eq("id", firstVehicle.client_id)
        .maybeSingle();
      if (cErr) throw cErr;
      client = clientRow || null;
      if (client) {
        client.vehicle_plate =
          client.vehicle_plate || firstVehicle.plate || null;
        client.vehicle_brand =
          client.vehicle_brand || firstVehicle.brand || null;
        client.vehicle_model =
          client.vehicle_model || firstVehicle.model || null;
      }
    }
    if (!client) {
      client = clientsLegacy && clientsLegacy.length ? clientsLegacy[0] : null;
    }

    const { data: allOrders, error: orderErr } = await supabase
      .from("work_orders")
      .select(
        "id, status, total, notes, created_at, updated_at, appointment_id"
      )
      .in("client_id", Array.from(candidateClientIds))
      .order("created_at", { ascending: false });
    if (orderErr) throw orderErr;
    if (!allOrders || !allOrders.length) {
      return res.json({
        client,
        order: null,
        orders: [],
        services: [],
        inspections: { initial: false, final: false },
      });
    }
    const order = allOrders[0];

    // Servicios asociados a la orden
    const { data: wos, error: wosErr } = await supabase
      .from("work_order_services")
      .select("service_id, quantity, unit_price, notes")
      .eq("work_order_id", order.id);
    if (wosErr) throw wosErr;

    const serviceIds = (wos || []).map((r) => r.service_id).filter(Boolean);
    let serviceNamesMap = {};
    if (serviceIds.length) {
      const { data: services, error: svcErr } = await supabase
        .from("services")
        .select("id, name")
        .in("id", serviceIds);
      if (svcErr) throw svcErr;
      (services || []).forEach((s) => {
        serviceNamesMap[s.id] = s.name;
      });
    }

    const services = (wos || []).map((r) => ({
      service_id: r.service_id,
      name: serviceNamesMap[r.service_id] || null,
      quantity: r.quantity,
      unit_price: r.unit_price,
      notes: r.notes || null,
    }));

    // Inspecciones disponibles
    const [initRes, finalRes] = await Promise.all([
      supabase
        .from("initial_inspections")
        .select("id")
        .eq("work_order_id", order.id)
        .limit(1),
      supabase
        .from("final_inspections")
        .select("id")
        .eq("work_order_id", order.id)
        .limit(1),
    ]);
    const inspections = {
      initial: !!(initRes.data && initRes.data.length),
      final: !!(finalRes.data && finalRes.data.length),
    };

    // Mapear etiqueta amigable de status
    const statusLabel =
      {
        pending: "Pendiente",
        in_progress: "En Proceso",
        completed: "Completado",
        cancelled: "Cancelado",
      }[order.status] || order.status;

    let servicesByOrder = {};
    let initSet = new Set();
    let finalSet = new Set();
    try {
      const orderIds = (allOrders || []).map((o) => o.id);
      const { data: wosAll } = await supabase
        .from("work_order_services")
        .select("work_order_id, service_id, quantity, unit_price, notes")
        .in("work_order_id", orderIds);
      const svcIdsAll = Array.from(
        new Set((wosAll || []).map((r) => r.service_id).filter(Boolean))
      );
      let nameMapAll = {};
      if (svcIdsAll.length) {
        const { data: svcAll } = await supabase
          .from("services")
          .select("id, name")
          .in("id", svcIdsAll);
        (svcAll || []).forEach((s) => {
          nameMapAll[s.id] = s.name;
        });
      }
      (wosAll || []).forEach((r) => {
        const arr = servicesByOrder[r.work_order_id] || [];
        arr.push({
          service_id: r.service_id,
          name: nameMapAll[r.service_id] || null,
          quantity: r.quantity,
          unit_price: r.unit_price,
          notes: r.notes || null,
        });
        servicesByOrder[r.work_order_id] = arr;
      });
      const [{ data: initAll }, { data: finalAll }] = await Promise.all([
        supabase
          .from("initial_inspections")
          .select("work_order_id")
          .in("work_order_id", orderIds),
        supabase
          .from("final_inspections")
          .select("work_order_id")
          .in("work_order_id", orderIds),
      ]);
      (initAll || []).forEach((r) => initSet.add(r.work_order_id));
      (finalAll || []).forEach((r) => finalSet.add(r.work_order_id));
    } catch {}

    res.json({
      client,
      order: { ...order, status_label: statusLabel },
      orders: (allOrders || []).map((o) => ({
        id: o.id,
        status: o.status,
        status_label:
          {
            pending: "Pendiente",
            in_progress: "En Proceso",
            completed: "Completado",
            cancelled: "Cancelado",
          }[o.status] || o.status,
        created_at: o.created_at,
        total: o.total,
        services: servicesByOrder[o.id] || [],
        inspections: {
          initial: initSet.has(o.id),
          final: finalSet.has(o.id),
        },
      })),
      services,
      inspections,
    });
  } catch (e) {
    console.error("GET /public/orders/by-plate/:plate error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Listado público de servicios (solo lectura)
app.get("/public/services", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, description, base_price, duration_minutes")
      .order("base_price");
    if (error) throw error;
    res.json({ services: data || [] });
  } catch (e) {
    console.error("GET /public/services error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ----- Configuración de turnos nocturnos (solo admin) -----
let NIGHT_SHIFTS_ENABLED = false;

app.get("/admin/appointments/night", async (_req, res) => {
  try {
    res.json({ enabled: NIGHT_SHIFTS_ENABLED });
  } catch (e) {
    console.error("GET /admin/appointments/night error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/appointments/night", async (req, res) => {
  try {
    const { enabled } = req.body || {};
    NIGHT_SHIFTS_ENABLED = Boolean(enabled);
    res.json({ enabled: NIGHT_SHIFTS_ENABLED });
  } catch (e) {
    console.error("POST /admin/appointments/night error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Disponibilidad pública y agendamiento
const PUBLIC_APPT_CAPACITY = 3; // máximo por turno
const PUBLIC_WEEKDAY_SLOTS = [
  {
    key: "08-10",
    label: "8:00 – 10:00",
    startHour: 8,
    startMinute: 0,
    endHour: 10,
    endMinute: 0,
    duration: 120,
  },
  {
    key: "10-30_12",
    label: "10:30 – 12:00",
    startHour: 10,
    startMinute: 30,
    endHour: 12,
    endMinute: 0,
    duration: 90,
  },
  {
    key: "12-30_14",
    label: "12:30 – 2:00 pm",
    startHour: 12,
    startMinute: 30,
    endHour: 14,
    endMinute: 0,
    duration: 90,
  },
  {
    key: "14-16",
    label: "2:00 pm – 4:00 pm",
    startHour: 14,
    startMinute: 0,
    endHour: 16,
    endMinute: 0,
    duration: 120,
  },
  {
    key: "16-30_18",
    label: "4:30 pm – 6:00 pm",
    startHour: 16,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
    duration: 90,
  },
];
const PUBLIC_NIGHT_SLOTS = [
  {
    key: "18-30_20",
    label: "6:30 pm – 8:00 pm",
    startHour: 18,
    startMinute: 30,
    endHour: 20,
    endMinute: 0,
    duration: 90,
  },
  {
    key: "20-30_22",
    label: "8:30 pm – 10:00 pm",
    startHour: 20,
    startMinute: 30,
    endHour: 22,
    endMinute: 0,
    duration: 90,
  },
];
const isWeekdayPublic = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00");
  const day = d.getDay();
  return day >= 1 && day <= 5;
};
const publicSlotsForDate = (dateStr, nightEnabled) => {
  if (!dateStr) return [];
  const s = [];
  if (isWeekdayPublic(dateStr)) {
    s.push(...PUBLIC_WEEKDAY_SLOTS);
    if (nightEnabled) s.push(...PUBLIC_NIGHT_SLOTS);
  } else {
    if (nightEnabled) s.push(...PUBLIC_NIGHT_SLOTS);
  }
  return s;
};
const buildPublicSlotStartISO = (dateStr, slot) => {
  const d = new Date(dateStr + "T00:00");
  d.setHours(slot.startHour, slot.startMinute, 0, 0);
  return d.toISOString();
};
const buildPublicSlotEndDate = (dateStr, slot) => {
  const d = new Date(dateStr + "T00:00");
  d.setHours(slot.endHour, slot.endMinute, 0, 0);
  return d;
};

// GET disponibilidad (usa flag admin de turnos nocturnos)
app.get("/public/appointments/availability", async (req, res) => {
  try {
    const date = String(req.query.date || "").slice(0, 10);
    const night = NIGHT_SHIFTS_ENABLED;
    if (!date)
      return res
        .status(400)
        .json({ error: "Parámetro date requerido (YYYY-MM-DD)" });

    const slots = publicSlotsForDate(date, night);
    if (!slots.length)
      return res.json({
        date,
        night,
        capacity: PUBLIC_APPT_CAPACITY,
        slots: [],
      });

    const dayStart = new Date(date + "T00:00").toISOString();
    const dayEndDate = new Date(date + "T00:00");
    dayEndDate.setDate(dayEndDate.getDate() + 1);
    const dayEnd = dayEndDate.toISOString();

    const { data: appts, error } = await supabase
      .from("appointments")
      .select("id, scheduled_at, status")
      .gte("scheduled_at", dayStart)
      .lt("scheduled_at", dayEnd)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;

    const result = slots.map((s) => {
      const startISO = buildPublicSlotStartISO(date, s);
      const endDate = buildPublicSlotEndDate(date, s);
      const occupied = (appts || []).filter((a) => {
        const st = new Date(a.scheduled_at);
        const notCancelled = String(a.status || "scheduled") !== "cancelled";
        return notCancelled && st >= new Date(startISO) && st < endDate;
      }).length;
      return {
        key: s.key,
        label: s.label,
        start_iso: startISO,
        duration_minutes: s.duration,
        occupied,
        capacity: PUBLIC_APPT_CAPACITY,
        full: occupied >= PUBLIC_APPT_CAPACITY,
      };
    });

    res.json({ date, night, capacity: PUBLIC_APPT_CAPACITY, slots: result });
  } catch (e) {
    console.error(
      "GET /public/appointments/availability error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// POST crear cita pública (usa flag admin de turnos nocturnos)
app.post("/public/appointments", async (req, res) => {
  try {
    const {
      full_name,
      phone,
      vehicle_brand = null,
      vehicle_model = null,
      service_id = null,
      notes = null,
      date,
      slot_key,
    } = req.body || {};

    if (!full_name || !phone || !date || !slot_key) {
      return res
        .status(400)
        .json({ error: "full_name, phone, date y slot_key son requeridos" });
    }
    const phoneDigits = String(phone).replace(/\D/g, "").trim();
    if (!/^\d{11}$/.test(phoneDigits)) {
      return res
        .status(400)
        .json({ error: "Teléfono inválido: use 11 dígitos, ej: 04147131270" });
    }

    const slots = publicSlotsForDate(
      String(date).slice(0, 10),
      NIGHT_SHIFTS_ENABLED
    );
    const slot = slots.find((s) => s.key === slot_key);
    if (!slot)
      return res.status(400).json({ error: "slot_key inválido para la fecha" });

    const slotStartISO = buildPublicSlotStartISO(date, slot);
    const slotEndDate = buildPublicSlotEndDate(date, slot);

    const normalizedPhone = phoneDigits;
    let { data: client, error: cErr } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", normalizedPhone)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!client) {
      const ins = await supabase
        .from("clients")
        .insert({
          full_name,
          phone: normalizedPhone,
          vehicle_brand,
          vehicle_model,
        })
        .select("*")
        .maybeSingle();
      if (ins.error) throw ins.error;
      client = ins.data;
    }

    const { data: appts, error: aErr } = await supabase
      .from("appointments")
      .select("id, scheduled_at, status")
      .gte("scheduled_at", new Date(date + "T00:00").toISOString())
      .lt(
        "scheduled_at",
        (() => {
          const d = new Date(date + "T00:00");
          d.setDate(d.getDate() + 1);
          return d.toISOString();
        })()
      )
      .order("scheduled_at", { ascending: true });
    if (aErr) throw aErr;
    const occupied = (appts || []).filter((a) => {
      const st = new Date(a.scheduled_at);
      const notCancelled = String(a.status || "scheduled") !== "cancelled";
      return notCancelled && st >= new Date(slotStartISO) && st < slotEndDate;
    }).length;
    if (occupied >= PUBLIC_APPT_CAPACITY) {
      return res
        .status(409)
        .json({ error: "Turno lleno. Capacidad máxima alcanzada." });
    }

    const insAppt = await supabase
      .from("appointments")
      .insert({
        client_id: client.id,
        service_id,
        scheduled_at: slotStartISO,
        duration_minutes: slot.duration,
        notes,
        status: "scheduled",
      })
      .select("*")
      .maybeSingle();
    if (insAppt.error) throw insAppt.error;

    res.status(201).json({ appointment: insAppt.data, client });
  } catch (e) {
    console.error("POST /public/appointments error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Tasa del día (proxy) usando DolarAPI oficial
app.get("/admin/rate", async (_req, res) => {
  try {
    const url = "https://ve.dolarapi.com/v1/dolares/oficial";
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`DolarAPI error ${resp.status}`);
    const json = await resp.json();
    const promedio = Number(json?.promedio || 0);
    if (!promedio)
      return res
        .status(502)
        .json({ error: "Tasa no disponible", source: json });
    res.json({
      exchange_rate: promedio,
      source: json?.nombre || json?.fuente || "oficial",
    });
  } catch (e) {
    console.error("GET /admin/rate error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Listar usuarios (service role, ignora RLS)
app.get("/admin/users", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, username, role, phone, email, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ users: data || [] });
  } catch (e) {
    console.error("GET /admin/users error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/users", async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      username,
      role = "mechanic",
      phone = null,
      status = "active",
    } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "email y password son requeridos" });

    // Crear usuario en Auth (o localizar si existe)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    let authUser = data?.user;
    if (error || !authUser) {
      // localizar existente por email
      const { data: list, error: listErr } =
        await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) throw listErr;
      authUser = list?.users?.find((u) => u.email === email);
      if (!authUser)
        throw (
          error || new Error("No se pudo crear ni encontrar el usuario de Auth")
        );
    }

    const auth_user_id = authUser.id;
    // Upsert perfil en public.users por email
    const { data: existing, error: selErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (selErr && selErr.code !== "PGRST116") throw selErr; // ignore no rows

    if (existing) {
      const { data: upd, error: updErr } = await supabase
        .from("users")
        .update({ full_name, username, role, phone, status, auth_user_id })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      if (updErr) throw updErr;
      return res.json({ profile: upd, auth_user_id });
    } else {
      const { data: ins, error: insErr } = await supabase
        .from("users")
        .insert({
          full_name,
          username,
          role,
          phone,
          email,
          status,
          auth_user_id,
        })
        .select("*")
        .maybeSingle();
      if (insErr) throw insErr;
      return res.json({ profile: ins, auth_user_id });
    }
  } catch (e) {
    console.error("POST /admin/users error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch("/admin/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { password, full_name, username, role, phone, email, status } =
      req.body || {};

    // localizar perfil para obtener auth_user_id
    const { data: profile, error: selErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!profile)
      return res.status(404).json({ error: "Perfil no encontrado" });

    // actualizar password en Auth si aplica
    if (password && profile.auth_user_id) {
      const { error: updPassErr } = await supabase.auth.admin.updateUserById(
        profile.auth_user_id,
        { password }
      );
      if (updPassErr) throw updPassErr;
    }

    // actualizar perfil
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.status = status;

    const { data: upd, error: updErr } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updErr) throw updErr;
    res.json({ profile: upd, auth_user_id: profile.auth_user_id });
  } catch (e) {
    console.error("PATCH /admin/users/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/admin/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { data: profile, error: selErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!profile)
      return res.status(404).json({ error: "Perfil no encontrado" });

    // borrar perfil
    const { error: delErr } = await supabase
      .from("users")
      .delete()
      .eq("id", id);
    if (delErr) throw delErr;

    // borrar usuario de Auth si existe
    if (profile.auth_user_id) {
      const { error: authDelErr } = await supabase.auth.admin.deleteUser(
        profile.auth_user_id
      );
      if (authDelErr)
        console.warn(
          "Warning: delete auth user failed",
          authDelErr?.message || authDelErr
        );
    }

    res.json({
      ok: true,
      deleted_id: id,
      auth_user_id: profile.auth_user_id || null,
    });
  } catch (e) {
    console.error("DELETE /admin/users/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// --------- Admin Appointments (bypass del proxy usando service key) ---------
// Listar citas
app.get("/admin/appointments", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("scheduled_at", { ascending: false });
    if (error) throw error;
    res.json({ appointments: data || [] });
  } catch (e) {
    console.error("GET /admin/appointments error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Crear cita
app.post("/admin/appointments", async (req, res) => {
  try {
    const {
      client_id,
      scheduled_at,
      duration_minutes,
      notes,
      service_id,
      assigned_mechanic_id,
      status,
      total,
    } = req.body || {};

    if (!client_id || !scheduled_at) {
      return res
        .status(400)
        .json({ error: "client_id y scheduled_at son requeridos" });
    }

    const insertData = {
      client_id,
      scheduled_at,
      duration_minutes, // puede venir undefined, el default es 60
      notes,
      service_id,
      assigned_mechanic_id,
      status, // default 'scheduled'
      total, // default 0 o trigger si hay service_id
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert(insertData)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    res.status(201).json({ appointment: data });
  } catch (e) {
    console.error("POST /admin/appointments error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Confirmar cita y crear orden de trabajo asociada
app.post("/admin/appointments/:id/confirm", async (req, res) => {
  try {
    const id = req.params.id;
    // Buscar cita
    const { data: appt, error: selErr } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!appt) return res.status(404).json({ error: "Cita no encontrada" });
    if (!appt.service_id)
      return res
        .status(400)
        .json({ error: "La cita no tiene servicio asignado" });

    // Actualizar a confirmado y dejar que el trigger cree la orden vinculada (appointment_id)
    const { data: updAppt, error: updErr } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appt.id)
      .select("*")
      .maybeSingle();
    if (updErr) throw updErr;

    // Recuperar la orden creada por el trigger
    let { data: order, error: getOrderErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("appointment_id", appt.id)
      .maybeSingle();
    if (getOrderErr && getOrderErr.code !== "PGRST116") throw getOrderErr; // ignorar "no rows"

    // Fallback: si el trigger no está instalado, crear la orden manualmente y vincular appointment_id
    if (!order) {
      let insRes = await supabase
        .from("work_orders")
        .insert({
          client_id: appt.client_id,
          service_id: appt.service_id,
          assigned_mechanic_id: appt.assigned_mechanic_id || null,
          notes: appt.notes || null,
          status: "pending",
          appointment_id: appt.id,
        })
        .select("*")
        .maybeSingle();

      // Si falla por columna appointment_id inexistente, reintentar sin ese campo
      if (
        insRes.error &&
        String(insRes.error?.message || "")
          .toLowerCase()
          .includes("appointment_id")
      ) {
        insRes = await supabase
          .from("work_orders")
          .insert({
            client_id: appt.client_id,
            service_id: appt.service_id,
            assigned_mechanic_id: appt.assigned_mechanic_id || null,
            notes: appt.notes || null,
            status: "pending",
          })
          .select("*")
          .maybeSingle();
      }
      if (insRes.error) throw insRes.error;
      order = insRes.data;

      // Agregar detalle de servicio con precio base
      const { data: svc, error: svcErr } = await supabase
        .from("services")
        .select("id, base_price")
        .eq("id", appt.service_id)
        .maybeSingle();
      if (svcErr) throw svcErr;
      if (svc) {
        const { error: addDetErr } = await supabase
          .from("work_order_services")
          .insert({
            work_order_id: order.id,
            service_id: svc.id,
            quantity: 1,
            unit_price: svc.base_price || 0,
            notes: appt.notes || null,
          });
        if (addDetErr)
          console.warn(
            "Warning: no se pudo agregar detalle a la orden",
            addDetErr?.message || addDetErr
          );
      }
    }

    res.json({ appointment: updAppt, work_order: order || null });
  } catch (e) {
    console.error(
      "POST /admin/appointments/:id/confirm error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Cancelar cita (se conserva histórico)
app.post("/admin/appointments/:id/cancel", async (req, res) => {
  try {
    const id = req.params.id;
    const { data: updAppt, error: updErr } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updErr) throw updErr;
    res.json({ appointment: updAppt });
  } catch (e) {
    console.error(
      "POST /admin/appointments/:id/cancel error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// -----------------------------
// Productos
// -----------------------------
app.get("/admin/products", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, sku, name, description, brand, supplier_code, oem_code, unit_price, unit_cost, status, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ products: data || [] });
  } catch (e) {
    console.error("GET /admin/products error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/products", async (req, res) => {
  try {
    const {
      sku = null,
      name,
      description = null,
      brand = null,
      supplier_code = null,
      oem_code = null,
      unit_price = 0,
      unit_cost = 0,
      status = "active",
    } = req.body || {};
    if (!name) return res.status(400).json({ error: "name es requerido" });
    const { data, error } = await supabase
      .from("products")
      .insert({ sku, name, description, unit_price, unit_cost, status })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return res.json({ product: data });
  } catch (e) {
    console.error("POST /admin/products error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.put("/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku,
      name,
      description,
      brand,
      supplier_code,
      oem_code,
      unit_price,
      unit_cost,
      status,
    } = req.body || {};
    const updateFields = {
      sku,
      name,
      description,
      brand,
      supplier_code,
      oem_code,
      unit_price,
      unit_cost,
      status,
    };
    Object.keys(updateFields).forEach(
      (k) => updateFields[k] === undefined && delete updateFields[k]
    );
    const minimal = {
      sku,
      name,
      description,
      unit_price,
      unit_cost,
      status,
    };
    Object.keys(minimal).forEach(
      (k) => minimal[k] === undefined && delete minimal[k]
    );
    const { data, error } = await supabase
      .from("products")
      .update(minimal)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return res.json({ product: data });
  } catch (e) {
    console.error("PUT /admin/products/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const del = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (del.error) {
      const msg = String(del.error.message || del.error);
      const code = del.error && del.error.code;
      if (
        code === "23503" ||
        /foreign key|violates foreign key|delete restrict/i.test(msg)
      ) {
        return res.status(409).json({
          error:
            "No se puede eliminar: el producto tiene compras/ventas/inventario asociado",
        });
      }
      throw del.error;
    }
    if (!del.data)
      return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ ok: true, deleted_id: del.data.id });
  } catch (e) {
    console.error("DELETE /admin/products/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// -----------------------------
// Proveedores
// -----------------------------
app.get("/admin/suppliers", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, phone, email, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ suppliers: data || [] });
  } catch (e) {
    console.error("GET /admin/suppliers error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/suppliers", async (req, res) => {
  try {
    const {
      name,
      phone = null,
      email = null,
      status = "active",
    } = req.body || {};
    if (!name) return res.status(400).json({ error: "name es requerido" });
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ name, phone, email, status })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ supplier: data });
  } catch (e) {
    console.error("POST /admin/suppliers error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.put("/admin/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, status } = req.body || {};
    const updateFields = { name, phone, email, status };
    Object.keys(updateFields).forEach(
      (k) => updateFields[k] === undefined && delete updateFields[k]
    );
    const { data, error } = await supabase
      .from("suppliers")
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ supplier: data });
  } catch (e) {
    console.error("PUT /admin/suppliers/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/admin/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) throw error;
    res.json({ ok: true, deleted_id: id });
  } catch (e) {
    console.error("DELETE /admin/suppliers/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// -----------------------------
// Compras
// -----------------------------
app.get("/admin/purchases", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("purchase_invoices")
      .select("*, supplier:suppliers(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ purchases: data || [] });
  } catch (e) {
    console.error("GET /admin/purchases error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/admin/purchases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: purchase, error: pErr } = await supabase
      .from("purchase_invoices")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!purchase)
      return res.status(404).json({ error: "Compra no encontrada" });
    if (purchase.status === "received") {
      return res
        .status(409)
        .json({ error: "No se puede eliminar: la compra ya fue recibida" });
    }
    const delItems = await supabase
      .from("purchase_items")
      .delete()
      .eq("purchase_id", id);
    if (delItems.error) throw delItems.error;
    const del = await supabase
      .from("purchase_invoices")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (del.error) throw del.error;
    if (!del.data)
      return res.status(404).json({ error: "No se pudo eliminar" });
    res.json({ ok: true, deleted_id: del.data.id });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/foreign key|violates|constraint/i.test(msg)) {
      return res
        .status(409)
        .json({ error: "No se puede eliminar: restricciones de integridad" });
    }
    console.error("DELETE /admin/purchases/:id error:", msg);
    res.status(500).json({ error: msg });
  }
});
app.post("/admin/purchases", async (req, res) => {
  try {
    const { supplier_id = null, notes = null, items = [] } = req.body || {};
    // Crear factura de compra (status=open)
    let { data: purchase, error: pErr } = await supabase
      .from("purchase_invoices")
      .insert({ supplier_id, notes, status: "open" })
      .select("*")
      .maybeSingle();
    if (pErr) throw pErr;

    // Agregar items si vienen
    if (Array.isArray(items) && items.length) {
      const rows = items.map((it) => ({
        purchase_id: purchase.id,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_cost: it.unit_cost,
      }));
      const { error: iErr } = await supabase
        .from("purchase_items")
        .insert(rows);
      if (iErr) throw iErr;
    }

    // Releer compra con total calculado
    const { data: refreshed, error: rErr } = await supabase
      .from("purchase_invoices")
      .select("*, items:purchase_items(*)")
      .eq("id", purchase.id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ purchase: refreshed });
  } catch (e) {
    console.error("POST /admin/purchases error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/purchases/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [] } = req.body || {};
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "items es requerido" });
    const rows = items.map((it) => ({
      purchase_id: id,
      product_id: it.product_id,
      quantity: it.quantity,
      unit_cost: it.unit_cost,
    }));
    const { error } = await supabase.from("purchase_items").insert(rows);
    if (error) throw error;
    const { data: purchase, error: rErr } = await supabase
      .from("purchase_invoices")
      .select("*, items:purchase_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ purchase });
  } catch (e) {
    console.error("POST /admin/purchases/:id/items error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Obtener compra con sus items
app.get("/admin/purchases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("purchase_invoices")
      .select("*, items:purchase_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    res.json({ purchase: data });
  } catch (e) {
    console.error("GET /admin/purchases/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Actualizar item de compra (cantidad/costo)
app.put("/admin/purchases/:id/items/:itemId", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity = null, unit_cost = null } = req.body || {};
    const update = {};
    if (quantity !== null) update.quantity = quantity;
    if (unit_cost !== null) update.unit_cost = unit_cost;
    const { error: uErr } = await supabase
      .from("purchase_items")
      .update(update)
      .eq("id", itemId);
    if (uErr) throw uErr;
    const { data: purchase, error: rErr } = await supabase
      .from("purchase_invoices")
      .select("*, items:purchase_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ purchase });
  } catch (e) {
    console.error(
      "PUT /admin/purchases/:id/items/:itemId error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Eliminar item de compra
app.delete("/admin/purchases/:id/items/:itemId", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { error: dErr } = await supabase
      .from("purchase_items")
      .delete()
      .eq("id", itemId);
    if (dErr) throw dErr;
    const { data: purchase, error: rErr } = await supabase
      .from("purchase_invoices")
      .select("*, items:purchase_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ purchase });
  } catch (e) {
    console.error(
      "DELETE /admin/purchases/:id/items/:itemId error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/purchases/:id/receive", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      document_type = null,
      invoice_number = null,
      control_number = null,
      document_date = null,
    } = req.body || {};
    const update = {
      status: "received",
      document_type,
      invoice_number,
      control_number,
      document_date,
      received_at: new Date().toISOString(),
    };
    const attempt = await supabase
      .from("purchase_invoices")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (attempt.error) {
      const msg = String(attempt.error.message || attempt.error);
      if (/column .* does not exist|schema cache|document_/i.test(msg)) {
        const minimal = await supabase
          .from("purchase_invoices")
          .update({ status: "received", received_at: new Date().toISOString() })
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (minimal.error) throw minimal.error;
        return res.json({ purchase: minimal.data });
      }
      throw attempt.error;
    }
    res.json({ purchase: attempt.data });
  } catch (e) {
    console.error("POST /admin/purchases/:id/receive error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/admin/purchases/:id/order-pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: purchase, error } = await supabase
      .from("purchase_invoices")
      .select("*, supplier:suppliers(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!purchase) return res.status(404).send("Compra no encontrada");
    const { data: items, error: iErr } = await supabase
      .from("purchase_items")
      .select("quantity, unit_cost, product:products(sku,name,supplier_code)")
      .eq("purchase_id", id)
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;
    const rows = (items || [])
      .map((it) => {
        const p = it && it.product ? it.product : {};
        return `<tr>
        <td style=\"padding:8px;border-bottom:1px solid #ddd\">${
          p.sku || ""
        }</td>
        <td style=\"padding:8px;border-bottom:1px solid #ddd\">${
          p.name || ""
        }</td>
        <td style=\"padding:8px;border-bottom:1px solid #ddd\">${
          p.supplier_code || ""
        }</td>
        <td style=\"padding:8px;border-bottom:1px solid #ddd;text-align:right\">${Number(
          it.quantity || 0
        ).toFixed(2)}</td>
        <td style=\"padding:8px;border-bottom:1px solid #ddd;text-align:right\">${Number(
          it.unit_cost || 0
        ).toFixed(2)}</td>
      </tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\" />
      <title>Orden de compra</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111} h1{font-size:20px} .meta{margin-bottom:12px;color:#333}
      table{width:100%;border-collapse:collapse;font-size:12px} th{background:#eee;text-align:left;padding:8px} td{font-size:12px}
      .footer{margin-top:16px;color:#555;font-size:12px}
      </style></head><body>
      <h1>Orden de compra</h1>
      <div class=\"meta\">
        <div>Compra #${purchase.purchase_number || purchase.id}</div>
        <div>Proveedor: ${
          purchase && purchase.supplier
            ? purchase.supplier.name
            : purchase.supplier_id
        }</div>
        <div>Creada: ${new Date(purchase.created_at).toLocaleString()}</div>
        <div>Estado: ${purchase.status}</div>
      </div>
      <table>
        <thead>
          <tr><th>SKU</th><th>Producto</th><th>Código proveedor</th><th style=\"text-align:right\">Cantidad</th><th style=\"text-align:right\">Costo U.</th></tr>
        </thead>
        <tbody>${rows || ""}</tbody>
      </table>
      <div class=\"footer\">Este documento es una solicitud de compra. Precios sujetos a cambio.</div>
      </body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    console.error("GET /admin/purchases/:id/order-pdf error:", e?.message || e);
    res.status(500).send(String(e?.message || e));
  }
});

// -----------------------------
// POS
// -----------------------------
app.post("/admin/pos/sales", async (req, res) => {
  try {
    const { notes = null, client_id = null } = req.body || {};
    // Fijar tasa del día en la venta
    let exchange_rate = null;
    try {
      const resp = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (resp.ok) {
        const json = await resp.json();
        const promedio = Number(json?.promedio || 0);
        if (promedio > 0) exchange_rate = promedio;
      }
    } catch {}
    const row = { notes, status: "open", exchange_rate, client_id };
    const { data, error } = await supabase
      .from("pos_sales")
      .insert(row)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ sale: data });
  } catch (e) {
    console.error("POST /admin/pos/sales error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/pos/sales/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [] } = req.body || {};
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "items es requerido" });
    const isAdmin =
      String(req.headers["x-role"] || "").toLowerCase() === "admin";
    const { data: saleRow, error: sErr } = await supabase
      .from("pos_sales")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!saleRow) return res.status(404).json({ error: "Venta no encontrada" });
    if (!isAdmin && String(saleRow.status) !== "open")
      return res.status(409).json({ error: "Venta cerrada: sólo consulta" });
    // Si viene service_id y no unit_price, intentar tomar base_price del servicio
    const rows = [];
    for (const it of items) {
      let unit_price = it.unit_price ?? 0;
      if (
        it.service_id &&
        (unit_price === 0 || unit_price === null || unit_price === undefined)
      ) {
        const { data: svc } = await supabase
          .from("services")
          .select("base_price")
          .eq("id", it.service_id)
          .maybeSingle();
        unit_price = Number(svc?.base_price || 0);
      }
      rows.push({
        sale_id: id,
        product_id: it.product_id || null,
        service_id: it.service_id || null,
        work_order_id: it.work_order_id || null,
        description: it.description || null,
        quantity: it.quantity ?? 1,
        unit_price,
      });
    }
    const { error } = await supabase.from("pos_sale_items").insert(rows);
    if (error) throw error;
    const { data: sale, error: rErr } = await supabase
      .from("pos_sales")
      .select("*, items:pos_sale_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ sale });
  } catch (e) {
    console.error("POST /admin/pos/sales/:id/items error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.put("/admin/pos/sales/:id/items/:itemId", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, unit_price } = req.body || {};
    const update = {};
    if (quantity !== undefined) update.quantity = Number(quantity);
    if (unit_price !== undefined) update.unit_price = Number(unit_price);
    const isAdmin =
      String(req.headers["x-role"] || "").toLowerCase() === "admin";
    const { data: saleRow, error: sErr } = await supabase
      .from("pos_sales")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!saleRow) return res.status(404).json({ error: "Venta no encontrada" });
    if (!isAdmin && String(saleRow.status) !== "open")
      return res.status(409).json({ error: "Venta cerrada: sólo consulta" });
    const { data: changed, error: uErr } = await supabase
      .from("pos_sale_items")
      .update(update)
      .eq("id", itemId)
      .eq("sale_id", id)
      .select("*")
      .maybeSingle();
    if (uErr) throw uErr;
    const { data: sale, error: rErr } = await supabase
      .from("pos_sales")
      .select("*, items:pos_sale_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ sale, item: changed });
  } catch (e) {
    console.error(
      "PUT /admin/pos/sales/:id/items/:itemId error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/admin/pos/sales/:id/items/:itemId", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const isAdmin =
      String(req.headers["x-role"] || "").toLowerCase() === "admin";
    const { data: saleRow, error: sErr } = await supabase
      .from("pos_sales")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!saleRow) return res.status(404).json({ error: "Venta no encontrada" });
    if (!isAdmin && String(saleRow.status) !== "open")
      return res.status(409).json({ error: "Venta cerrada: sólo consulta" });
    const { data: del, error } = await supabase
      .from("pos_sale_items")
      .delete()
      .eq("id", itemId)
      .eq("sale_id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    const { data: sale, error: rErr } = await supabase
      .from("pos_sales")
      .select("*, items:pos_sale_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    res.json({ ok: true, deleted_id: del?.id, sale });
  } catch (e) {
    console.error(
      "DELETE /admin/pos/sales/:id/items/:itemId error:",
      e?.message || e
    );
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/pos/sales/:id/pay", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, payments } = req.body || {};
    // Leer tasa fijada de la venta (para convertir VES->USD)
    const { data: saleInfo } = await supabase
      .from("pos_sales")
      .select("id,total,exchange_rate")
      .eq("id", id)
      .maybeSingle();
    const exRate = Number(saleInfo?.exchange_rate || 0) || null;
    // Soportar nuevo flujo: payments = [{ method, amount }, ...]
    if (Array.isArray(payments) && payments.length) {
      // Insertar pagos y calcular total pagado
      const rows = payments.map((p) => {
        const currency = (p.currency || "").toUpperCase();
        const bank = p.bank || null;
        const original_amount = Number(p.amount || 0);
        let amount = original_amount;
        if (currency === "VES") {
          amount = exRate ? original_amount / exRate : original_amount; // fallback si no hay tasa
        }
        return {
          sale_id: id,
          method: p.method,
          amount,
          original_amount,
          currency: currency || "USD",
          bank,
        };
      });
      let ins;
      try {
        ins = await supabase.from("pos_sale_payments").insert(rows);
      } catch (e) {
        ins = { error: e };
      }
      if (ins?.error) {
        // Posible que columnas currency/original_amount/bank aún no existan; intentar inserción mínima
        const minimalRows = rows.map((r) => ({
          sale_id: r.sale_id,
          method: r.method,
          amount: r.amount,
        }));
        try {
          ins = await supabase.from("pos_sale_payments").insert(minimalRows);
        } catch (e2) {
          ins = { error: e2 };
        }
        if (ins?.error) {
          const msg = String(ins.error.message || "");
          const isMethodCheck =
            /pos_sale_payments_method_check|check constraint|23514/i.test(msg);
          if (isMethodCheck) {
            // Compat: mapear métodos nuevos a legacy ('cash','card','transfer')
            const mapMethod = (m) => {
              switch (String(m)) {
                case "cash_usd":
                case "cash_bs":
                  return "cash";
                case "pos":
                  return "card";
                case "pagomovil_bs":
                case "transfer_bs":
                case "paypal":
                case "zinli":
                case "credit":
                  return "transfer";
                default:
                  return "cash";
              }
            };
            const legacyRows = minimalRows.map((r) => ({
              sale_id: r.sale_id,
              method: mapMethod(r.method),
              amount: r.amount,
            }));
            try {
              ins = await supabase.from("pos_sale_payments").insert(legacyRows);
            } catch (e3) {
              ins = { error: e3 };
            }
          }
        }
      }
      // Si la tabla no existe (migración no aplicada), fallback a método anterior
      if (
        ins.error &&
        /relation .* does not exist/i.test(ins.error.message || "")
      ) {
        if (!payment_method)
          return res.status(400).json({ error: "payment_method es requerido" });
        const { data, error } = await supabase
          .from("pos_sales")
          .update({ status: "paid", payment_method })
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        return res.json({ sale: data });
      }

      // Obtener total de venta y total pagado
      const { data: saleRow, error: sErr } = await supabase
        .from("pos_sales")
        .select("id,total")
        .eq("id", id)
        .maybeSingle();
      if (sErr) throw sErr;
      let { data: payRows, error: pErr } = await supabase
        .from("pos_sale_payments")
        .select("amount,method,currency,original_amount,bank")
        .eq("sale_id", id);
      if (pErr) {
        const alt = await supabase
          .from("pos_sale_payments")
          .select("amount,method")
          .eq("sale_id", id);
        if (alt.error) throw alt.error;
        payRows = alt.data || [];
      }
      const totalPaid = (payRows || []).reduce(
        (acc, r) => acc + Number(r.amount || 0),
        0
      );
      const distinctMethods = Array.from(
        new Set((payRows || []).map((r) => r.method))
      );
      const pm =
        distinctMethods.length > 1 ? "mixed" : distinctMethods[0] || null;
      // No cambiar a 'paid' aquí: el cierre se realiza en /finalize.
      const status = "open";
      const { data: updated, error: uErr } = await supabase
        .from("pos_sales")
        .update({ payment_method: pm, status })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (uErr) throw uErr;
      return res.json({ sale: updated, paid_amount: totalPaid });
    }

    // Fallback: flujo simple
    if (!payment_method)
      return res.status(400).json({ error: "payment_method es requerido" });
    const { data, error } = await supabase
      .from("pos_sales")
      .update({ status: "paid", payment_method })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ sale: data });
  } catch (e) {
    console.error("POST /admin/pos/sales/:id/pay error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Obtener una venta con items y pagos
app.get("/admin/pos/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: sale, error } = await supabase
      .from("pos_sales")
      .select("*, items:pos_sale_items(*), payments:pos_sale_payments(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    res.json({ sale });
  } catch (e) {
    console.error("GET /admin/pos/sales/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Finalizar venta solo si los pagos cuadran exactamente con el total
app.post("/admin/pos/sales/:id/finalize", async (req, res) => {
  try {
    const { id } = req.params;

    // Leer total de la venta
    const { data: saleRow, error: sErr } = await supabase
      .from("pos_sales")
      .select("id,total")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!saleRow) return res.status(404).json({ error: "Venta no encontrada" });

    // Intentar leer pagos
    const { data: payRows, error: pErr } = await supabase
      .from("pos_sale_payments")
      .select("amount,method")
      .eq("sale_id", id);

    if (pErr && /relation .* does not exist/i.test(pErr.message || "")) {
      // Fallback: sin tabla de pagos, exigir payment_method no nulo
      const { data: upd, error: uErr } = await supabase
        .from("pos_sales")
        .update({ status: "paid" })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (uErr) throw uErr;
      return res.json({
        sale: upd,
        note: "Finalizado sin tabla de pagos (fallback)",
      });
    }

    const totalPaid = (payRows || []).reduce(
      (acc, r) => acc + Number(r.amount || 0),
      0
    );
    const total = Number(saleRow.total || 0);
    const eq =
      Math.abs(Number(totalPaid.toFixed(2)) - Number(total.toFixed(2))) < 0.001;
    if (!eq) {
      const diff = Number((total - totalPaid).toFixed(2));
      return res.status(400).json({
        error: "Pagos no cuadran con total",
        total,
        total_paid: totalPaid,
        difference: diff,
      });
    }

    const distinctMethods = Array.from(
      new Set((payRows || []).map((r) => r.method))
    );
    const pm =
      distinctMethods.length > 1 ? "mixed" : distinctMethods[0] || null;
    const { data: updated, error: uErr } = await supabase
      .from("pos_sales")
      .update({ status: "paid", payment_method: pm })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (uErr) throw uErr;
    res.json({ sale: updated });
  } catch (e) {
    console.error("POST /admin/pos/sales/:id/finalize error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/pos/sales/:id/void", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("pos_sales")
      .update({ status: "void" })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ sale: data });
  } catch (e) {
    console.error("POST /admin/pos/sales/:id/void error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Registrar devolución de venta (items devueltos e ingreso a inventario)
app.post("/admin/pos/sales/:id/returns", async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], notes = null } = req.body || {};
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "items es requerido" });

    // Crear cabecera de devolución
    const { data: ret, error: rErr } = await supabase
      .from("pos_returns")
      .insert({ sale_id: id, notes, status: "completed" })
      .select("*")
      .maybeSingle();
    if (rErr) throw rErr;

    // Insertar items de devolución y movimientos de inventario para productos
    let total = 0;
    for (const it of items) {
      const row = {
        return_id: ret.id,
        sale_item_id: it.sale_item_id || null,
        product_id: it.product_id || null,
        service_id: it.service_id || null,
        quantity: Number(it.quantity || 0),
        unit_price: Number(it.unit_price || 0),
      };
      total += Number(row.quantity) * Number(row.unit_price);
      const { error: iErr } = await supabase
        .from("pos_return_items")
        .insert(row);
      if (iErr) throw iErr;

      if (row.product_id && row.quantity) {
        const { error: invErr } = await supabase
          .from("inventory_movements")
          .insert({
            product_id: row.product_id,
            movement_type: "in",
            quantity: row.quantity,
            notes: `Devolución venta ${id}`,
          });
        if (invErr)
          console.warn(
            "Warning inventario devolución:",
            invErr?.message || invErr
          );
      }
    }

    // Actualizar total de la devolución
    const { data: updatedRet, error: uErr } = await supabase
      .from("pos_returns")
      .update({ total })
      .eq("id", ret.id)
      .select("*")
      .maybeSingle();
    if (uErr) throw uErr;
    res.json({ return: updatedRet });
  } catch (e) {
    console.error("POST /admin/pos/sales/:id/returns error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Listar servicios creados
app.get("/admin/services", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");
    if (error) throw error;
    res.json({ services: data });
  } catch (e) {
    console.error("GET /admin/services error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});
// Listar servicios creados por ID
app.get("/admin/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Servicio no encontrado" });

    res.json({ service: data });
  } catch (e) {
    console.error("GET /admin/services/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});
// Crear servicio
app.post("/admin/services", async (req, res) => {
  try {
    const {
      name,
      description = null,
      base_price = 0,
      duration_minutes = 60,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name es requerido" });
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        name,
        description,
        base_price,
        duration_minutes,
      })
      .select("*")
      .maybeSingle();

    if (error) throw error;
    res.json({ service: data });
  } catch (e) {
    console.error("POST /admin/services error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});
// Actualizar servicio
app.put("/admin/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, base_price, duration_minutes } = req.body || {};

    const updateFields = {
      name,
      description,
      base_price,
      duration_minutes,
    };

    // remover claves undefined
    Object.keys(updateFields).forEach(
      (k) => updateFields[k] === undefined && delete updateFields[k]
    );

    const { data, error } = await supabase
      .from("services")
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    res.json({ service: data });
  } catch (e) {
    console.error("PUT /admin/services/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});
// Borrar servicio
app.delete("/admin/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) throw error;

    res.json({ ok: true, deleted_id: id });
  } catch (e) {
    console.error("DELETE /admin/services/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Actualizar venta POS: asignar cliente o notas
app.put("/admin/pos/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id = null, notes = undefined } = req.body || {};
    const update = {};
    if (client_id !== null) update.client_id = client_id;
    if (typeof notes !== "undefined") update.notes = notes;
    const isAdmin =
      String(req.headers["x-role"] || "").toLowerCase() === "admin";
    const { data: saleRow, error: sErr } = await supabase
      .from("pos_sales")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!saleRow) return res.status(404).json({ error: "Venta no encontrada" });
    if (!isAdmin && String(saleRow.status) !== "open")
      return res.status(409).json({ error: "Venta cerrada: sólo consulta" });
    const { data, error } = await supabase
      .from("pos_sales")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ sale: data });
  } catch (e) {
    console.error("PUT /admin/pos/sales/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete("/admin/pos/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: sale, error: sErr } = await supabase
      .from("pos_sales")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!sale) return res.status(404).json({ error: "Venta no encontrada" });
    const [{ count: itemsCount }, { count: payCount }] = await Promise.all([
      supabase
        .from("pos_sale_items")
        .select("id", { count: "exact", head: true })
        .eq("sale_id", id),
      supabase
        .from("pos_sale_payments")
        .select("id", { count: "exact", head: true })
        .eq("sale_id", id),
    ]);
    if ((itemsCount || 0) > 0 || (payCount || 0) > 0) {
      return res
        .status(409)
        .json({ error: "No se puede eliminar: la venta tiene items o pagos" });
    }
    const { data: del, error } = await supabase
      .from("pos_sales")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    res.json({ ok: true, deleted_id: del?.id });
  } catch (e) {
    console.error("DELETE /admin/pos/sales/:id error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// -----------------------------
// Inventario: stock y ajustes
// -----------------------------
app.get("/admin/inventory/stock", async (_req, res) => {
  try {
    // Sumar entradas menos salidas por producto
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("product_id, movement_type, quantity");
    if (error) throw error;
    const agg = new Map();
    (data || []).forEach((m) => {
      const pid = m.product_id;
      const qty = Number(m.quantity || 0);
      const type = m.movement_type;
      const prev = agg.get(pid) || 0;
      agg.set(pid, prev + (type === "in" ? qty : -qty));
    });
    // Join simple con productos
    const { data: prods, error: pErr } = await supabase
      .from("products")
      .select("id, sku, name, unit_price, unit_cost, status");
    if (pErr) throw pErr;
    const result = (prods || []).map((p) => ({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      unit_price: p.unit_price,
      unit_cost: p.unit_cost,
      status: p.status,
      stock: agg.get(p.id) || 0,
    }));
    res.json({ stock: result });
  } catch (e) {
    console.error("GET /admin/inventory/stock error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/admin/inventory/adjust", async (req, res) => {
  try {
    const {
      product_id,
      movement_type,
      quantity,
      unit_cost = 0,
      notes = null,
    } = req.body || {};
    if (!product_id || !movement_type || !quantity)
      return res
        .status(400)
        .json({ error: "product_id, movement_type, quantity requeridos" });
    if (!["in", "out"].includes(movement_type))
      return res.status(400).json({ error: "movement_type debe ser in/out" });
    const row = {
      product_id,
      movement_type,
      quantity,
      unit_cost,
      source: "adjustment",
      source_id: null,
    };
    const { data, error } = await supabase
      .from("inventory_movements")
      .insert(row)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    res.json({ movement: data });
  } catch (e) {
    console.error("POST /admin/inventory/adjust error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// -----------------------------
// Reporte diario
// -----------------------------
app.get("/admin/reports/daily", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date)
      return res.status(400).json({ error: "date (YYYY-MM-DD) es requerido" });

    // Ventas del día
    const { data: sales, error: sErr } = await supabase
      .from("pos_sales")
      .select("id, total, payment_method, created_at")
      .gte("created_at", `${date}T00:00:00.000Z`)
      .lte("created_at", `${date}T23:59:59.999Z`);
    if (sErr) throw sErr;

    const saleIds = (sales || []).map((s) => s.id);
    let total_sales = 0;
    (sales || []).forEach((s) => {
      total_sales += Number(s.total || 0);
    });

    // Nuevos métodos de pago soportados y agregadores
    const methods = [
      "cash_usd",
      "cash_bs",
      "transfer_bs",
      "pos",
      "pagomovil_bs",
      "paypal",
      "zinli",
    ];
    const totals_usd_by_method = Object.fromEntries(methods.map((m) => [m, 0]));
    const original_by_currency = { USD: 0, VES: 0 };
    const original_by_currency_by_method = { USD: {}, VES: {} };
    const bank_breakdown = { pos: {}, pagomovil_bs: {} };

    // Intentar desglose real por pagos si existe la tabla
    if (saleIds.length) {
      const payQ = await supabase
        .from("pos_sale_payments")
        .select("sale_id, method, amount, currency, original_amount, bank")
        .in("sale_id", saleIds);
      if (!payQ.error) {
        (payQ.data || []).forEach((p) => {
          const m = p.method;
          const usd = Number(p.amount || 0);
          const curr = (p.currency || "USD").toUpperCase();
          const orig = Number(p.original_amount || usd);
          if (m && totals_usd_by_method.hasOwnProperty(m))
            totals_usd_by_method[m] += usd;
          if (curr === "USD" || curr === "VES") {
            original_by_currency[curr] += orig;
            original_by_currency_by_method[curr][m] =
              (original_by_currency_by_method[curr][m] || 0) + orig;
          }
          if (m === "pos" || m === "pagomovil_bs") {
            const bank = p.bank || "SIN_BANCO";
            bank_breakdown[m][bank] = (bank_breakdown[m][bank] || 0) + orig;
          }
        });
      } else {
        // Fallback: usar payment_method de la venta (sin desglose por moneda)
        (sales || []).forEach((s) => {
          const pm = s.payment_method;
          if (pm && totals_usd_by_method.hasOwnProperty(pm))
            totals_usd_by_method[pm] += Number(s.total || 0);
        });
      }
    }

    // Desglose por productos y servicios
    let total_products = 0;
    let total_services = 0;
    if (saleIds.length) {
      const { data: items, error: iErr } = await supabase
        .from("pos_sale_items")
        .select("sale_id, product_id, work_order_id, quantity, unit_price")
        .in("sale_id", saleIds);
      if (iErr) throw iErr;
      (items || []).forEach((it) => {
        const subtotal = Number(it.quantity || 0) * Number(it.unit_price || 0);
        if (it.product_id) total_products += subtotal;
        else total_services += subtotal;
      });
    }

    res.json({
      date,
      total_sales_usd: total_sales,
      totals_usd_by_method,
      original_by_currency,
      original_by_currency_by_method,
      bank_breakdown,
      total_products,
      total_services,
      sales_count: (sales || []).length,
    });
  } catch (e) {
    console.error("GET /admin/reports/daily error:", e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Admin backend running on http://localhost:${PORT}`);
});
