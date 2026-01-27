import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Plus,
  Edit2,
  Trash2,
  User,
  Wrench,
  CheckCircle2,
  XCircle,
  CalendarRange,
  Moon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { ADMIN_BASE } from "../lib/api";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type Mechanic = Database["public"]["Tables"]["mechanics"]["Row"];
type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"];
type WorkOrderService =
  Database["public"]["Tables"]["work_order_services"]["Row"];

export default function AppointmentsManager({
  onNavigateToOrders,
}: {
  onNavigateToOrders?: () => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModal, setOrderModal] = useState<{
    order: WorkOrder | null;
    services: WorkOrderService[];
  }>({ order: null, services: [] });
  const [form, setForm] = useState<{
    client_id: string;
    service_id: string | null;
    assigned_mechanic_id: string | null;
    duration_minutes: string;
    notes: string;
  }>({
    client_id: "",
    service_id: null,
    assigned_mechanic_id: null,
    duration_minutes: "60",
    notes: "",
  });

  // Bloques/turnos y capacidad
  const capacity = 3;
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [nightShiftsEnabled, setNightShiftsEnabled] = useState<boolean>(false);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);

  type Slot = {
    key: string;
    label: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    duration: number;
  };

  const makeSlots = (
    dateStr: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    durationMin: number
  ): Slot[] => {
    const out: Slot[] = [];
    const start = new Date(dateStr + "T00:00");
    start.setHours(startHour, startMinute, 0, 0);
    const end = new Date(dateStr + "T00:00");
    end.setHours(endHour, endMinute, 0, 0);
    let cur = new Date(start);
    while (cur < end) {
      const next = new Date(cur);
      next.setMinutes(next.getMinutes() + durationMin);
      if (next > end) break;
      const sh = cur.getHours();
      const sm = cur.getMinutes();
      const eh = next.getHours();
      const em = next.getMinutes();
      const key = `${String(sh).padStart(2, "0")}-${
        sm === 0 ? "" : String(sm)
      }_${String(eh).padStart(2, "0")}-${em === 0 ? "" : String(em)}`.replace(
        /-_/g,
        "-"
      );
      const to12 = (h: number, m: number) => {
        const ampm = h >= 12 ? "pm" : "am";
        const hh = ((h + 11) % 12) + 1;
        const mm = String(m).padStart(2, "0");
        return `${hh}:${mm} ${ampm}`;
      };
      const label = `${to12(sh, sm)} – ${to12(eh, em)}`;
      out.push({
        key,
        label,
        startHour: sh,
        startMinute: sm,
        endHour: eh,
        endMinute: em,
        duration: durationMin,
      });
      cur = next;
    }
    return out;
  };

  const isWeekday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T00:00");
    const day = d.getDay();
    return day >= 1 && day <= 5;
  };
  const slotsForDate = (dateStr: string): Slot[] => {
    if (!dateStr) return [];
    const svc = services.find((x) => x.id === (form.service_id || ""));
    const base = Number(form.duration_minutes) || 60;
    const dmin = Math.max(30, Number(svc?.duration_minutes ?? base));
    let s: Slot[] = [];
    s = makeSlots(dateStr, 8, 0, 18, 0, dmin);
    if (nightShiftsEnabled) {
      s = s.concat(makeSlots(dateStr, 18, 30, 22, 0, dmin));
    }
    return s;
  };
  const buildSlotStartISO = (dateStr: string, slot: Slot): string => {
    const d = new Date(dateStr + "T00:00");
    d.setHours(slot.startHour, slot.startMinute, 0, 0);
    return d.toISOString();
  };
  const buildSlotEnd = (dateStr: string, slot: Slot): Date => {
    const d = new Date(dateStr + "T00:00");
    d.setHours(slot.endHour, slot.endMinute, 0, 0);
    return d;
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    // Sincronizar estado de jornadas nocturnas con backend admin
    const fetchNightSetting = async () => {
      try {
        const resp = await fetch(`${ADMIN_BASE}/admin/appointments/night`, { headers: { 'X-Role': 'admin' } });
        if (!resp.ok) return;
        const json = await resp.json();
        setNightShiftsEnabled(Boolean(json?.enabled));
      } catch (e) {
        console.warn("No se pudo obtener configuración nocturna (admin):", e);
      }
    };
    fetchNightSetting();
  }, []);

  useEffect(() => {
    const fetchDay = async () => {
      if (!selectedDate) {
        setDayAppointments([]);
        return;
      }
      const start = new Date(selectedDate + "T00:00");
      const end = new Date(selectedDate + "T00:00");
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) {
        console.error("Error loading day appointments:", error);
        setDayAppointments([]);
      } else {
        setDayAppointments(data || []);
      }
    };
    fetchDay();
  }, [selectedDate]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const nowISO = new Date().toISOString();
      const [apRes, clRes, mechRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .order("scheduled_at", { ascending: true })
          .gte("scheduled_at", nowISO),
        supabase.from("clients").select("*").order("full_name"),
        supabase.from("mechanics").select("*").order("full_name"),
      ]);
      setAppointments(apRes.data || []);
      setClients(clRes.data || []);
      setMechanics(mechRes.data || []);

      // Servicios con fallback al backend admin si falla RLS/REST
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("name");
        if (error) throw error;
        setServices((data || []) as Service[]);
      } catch (_) {
        try {
          const resp = await fetch(`${ADMIN_BASE}/admin/services`, { headers: { 'X-Role': 'admin' } });
          if (!resp.ok)
            throw new Error(`Backend GET servicios falló: ${resp.status}`);
          const json = await resp.json();
          setServices((json?.services || []) as Service[]);
        } catch (be) {
          console.error("Error cargando servicios (fallback backend):", be);
          setServices([]);
        }
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
      alert("Error cargando datos de agendamiento");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      client_id: "",
      service_id: null,
      assigned_mechanic_id: null,
      duration_minutes: "60",
      notes: "",
    });
    setSelectedDate("");
    setSelectedSlotKey(null);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.client_id || !selectedDate || !selectedSlotKey) {
        alert("Cliente, fecha y turno son requeridos");
        return;
      }
      const slot = slotsForDate(selectedDate).find(
        (s) => s.key === selectedSlotKey
      );
      if (!slot) {
        alert("Selecciona un turno válido");
        return;
      }
      const slotStartISO = buildSlotStartISO(selectedDate, slot);
      const slotEnd = buildSlotEnd(selectedDate, slot);
      const currentOccupancy = dayAppointments.filter((a) => {
        const st = new Date(a.scheduled_at);
        return st >= new Date(slotStartISO) && st < slotEnd;
      });
      if (currentOccupancy.length >= capacity) {
        alert("Turno lleno. Capacidad máxima alcanzada (3 mecánicos).");
        return;
      }
      if (form.assigned_mechanic_id) {
        const mechanicBusy = currentOccupancy.some(
          (a) => a.assigned_mechanic_id === form.assigned_mechanic_id
        );
        if (mechanicBusy) {
          alert("El mecánico ya tiene una cita asignada en este turno.");
          return;
        }
      }
      const payload: Database["public"]["Tables"]["appointments"]["Insert"] = {
        client_id: form.client_id,
        service_id: form.service_id || null,
        assigned_mechanic_id: form.assigned_mechanic_id || null,
        scheduled_at: slotStartISO,
        duration_minutes: slot.duration,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        // Intento normal vía supabase-js (REST PostgREST detrás de proxy)
        const { error } = await supabase.from("appointments").insert([payload]);

        // Si el proxy vacía el cuerpo y obtenemos error (PGRST102/404), usar backend admin como fallback
        if (error) {
          console.warn(
            "Insert via supabase failed, trying admin backend fallback:",
            error
          );
          const resp = await fetch(`${ADMIN_BASE}/admin/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json", 'X-Role': 'admin' },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(
              `Admin backend insert failed: ${resp.status} ${txt}`
            );
          }
        }
      }
      setShowModal(false);
      resetForm();
      loadAll();
    } catch (err) {
      console.error("Error saving appointment:", err);
      alert("Error al guardar la cita");
    }
  };

  const handleEdit = (appt: Appointment) => {
    setEditing(appt);
    setForm({
      client_id: appt.client_id,
      service_id: appt.service_id,
      assigned_mechanic_id: appt.assigned_mechanic_id,
      duration_minutes: String(appt.duration_minutes ?? 60),
      notes: appt.notes || "",
    });
    const d = new Date(appt.scheduled_at);
    const dateStr = d.toISOString().slice(0, 10);
    setSelectedDate(dateStr);
    const sCandidates = slotsForDate(dateStr);
    const match = sCandidates.find((s) => {
      const st = new Date(buildSlotStartISO(dateStr, s));
      return st.getTime() === d.getTime();
    });
    setSelectedSlotKey(match?.key || null);
    setShowModal(true);
  };

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    try {
      // Si confirmamos o cancelamos, usar backend admin para garantizar creación de orden o histórico
      if (status === "confirmed" || status === "cancelled") {
        const endpoint =
          status === "confirmed"
            ? `${ADMIN_BASE}/admin/appointments/${id}/confirm`
            : `${ADMIN_BASE}/admin/appointments/${id}/cancel`;
        const resp = await fetch(endpoint, { method: "POST", headers: { 'X-Role': 'admin' } });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(
            `Admin backend status update failed: ${resp.status} ${txt}`
          );
        }
      } else {
        const { error } = await supabase
          .from("appointments")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      }
      loadAll();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("No se pudo actualizar el estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cita?")) return;
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      loadAll();
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert("No se pudo eliminar la cita");
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  const viewOrderForAppointment = async (appointmentId: string) => {
    try {
      const { data: orders, error: orderErr } = await supabase
        .from("work_orders")
        .select("*")
        .eq("appointment_id", appointmentId)
        .limit(1);
      if (orderErr) throw orderErr;
      const order = (orders && orders[0]) || null;
      let finalOrder = order;
      // Fallback: si no hay vínculo por appointment_id, intentar encontrar la última orden del mismo cliente/servicio
      if (!finalOrder) {
        const { data: appt, error: apptErr } = await supabase
          .from("appointments")
          .select("id, client_id, service_id")
          .eq("id", appointmentId)
          .maybeSingle();
        if (apptErr) throw apptErr;
        if (appt) {
          const { data: byAttributes, error: byAttrErr } = await supabase
            .from("work_orders")
            .select("*")
            .eq("client_id", appt.client_id)
            .eq("service_id", appt.service_id)
            .order("created_at", { ascending: false })
            .limit(1);
          if (byAttrErr) throw byAttrErr;
          finalOrder = (byAttributes && byAttributes[0]) || null;
        }
      }
      if (!finalOrder) {
        alert(
          "No hay orden vinculada a esta cita. Si la cita fue confirmada recientemente, refresca y vuelve a intentar."
        );
        return;
      }
      const { data: wos, error: wosErr } = await supabase
        .from("work_order_services")
        .select("*")
        .eq("work_order_id", finalOrder.id);
      if (wosErr) throw wosErr;
      setOrderModal({ order: finalOrder, services: wos || [] });
      setShowOrderModal(true);
    } catch (err) {
      console.error("Error al cargar la orden:", err);
      alert("No se pudo cargar la orden vinculada");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">
            AGENDAMIENTO
          </h2>
          <p className="text-neutral-400 text-racing">
            Gestión de citas del taller
          </p>
        </div>
        <button onClick={openNew} className="btn-gold flex items-center gap-2">
          <Plus className="w-5 h-5" /> NUEVA CITA
        </button>
      </div>

      {isLoading ? (
        <div className="card-metal p-12 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="card-metal p-12 text-center">
          <p className="text-neutral-400">No hay citas próximas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {appointments.map((a) => {
            const client = clients.find((c) => c.id === a.client_id);
            const service = services.find((s) => s.id === a.service_id);
            const mech = mechanics.find((m) => m.id === a.assigned_mechanic_id);
            return (
              <div
                key={a.id}
                className="card-metal p-6 hover:brightness-110 transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-neutral-100 mb-1 flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-amber-500" />{" "}
                      {client?.full_name || "Cliente"}
                    </h3>
                    <div className="text-neutral-400 text-sm flex items-center gap-2 mb-1">
                      <CalendarRange className="w-4 h-4" />
                      <span>
                        {fmtDate(a.scheduled_at)} • {a.duration_minutes} min
                      </span>
                    </div>
                    {service && (
                      <div className="text-neutral-400 text-sm flex items-center gap-2">
                        <Wrench className="w-4 h-4" />{" "}
                        <span>{service.name}</span>
                      </div>
                    )}
                    {mech && (
                      <div className="text-neutral-400 text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />{" "}
                        <span>{mech.full_name}</span>
                      </div>
                    )}
                    <div className="text-neutral-400 text-xs mt-2">
                      Nº Agendamiento:{" "}
                      <span className="text-neutral-200 font-semibold">
                        {typeof a.appointment_number === "number"
                          ? a.appointment_number
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`px-3 py-1 rounded text-xs uppercase tracking-wide border ${
                        a.status === "scheduled"
                          ? "bg-neutral-800/50 text-neutral-400 border-neutral-700/50"
                          : a.status === "confirmed"
                          ? "bg-blue-900/30 text-blue-400 border-blue-800/50"
                          : a.status === "completed"
                          ? "bg-green-900/30 text-green-400 border-green-800/50"
                          : "bg-red-900/30 text-red-400 border-red-800/50"
                      }`}
                    >
                      {a.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleEdit(a)}
                      className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatus(a.id, "confirmed")}
                    className="px-3 py-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar
                  </button>
                  <button
                    onClick={() => updateStatus(a.id, "completed")}
                    className="px-3 py-2 bg-green-900/30 text-green-400 rounded hover:bg-green-900/50 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Completar
                  </button>
                  <button
                    onClick={() => updateStatus(a.id, "cancelled")}
                    className="px-3 py-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                  {(a.status === "confirmed" || a.status === "completed") && (
                    <button
                      onClick={() => viewOrderForAppointment(a.id)}
                      className="px-3 py-2 bg-amber-900/30 text-amber-400 rounded hover:bg-amber-900/50 transition-colors"
                    >
                      Ver Orden
                    </button>
                  )}
                  {(a.status === "confirmed" || a.status === "completed") &&
                    onNavigateToOrders && (
                      <button
                        onClick={onNavigateToOrders}
                        className="px-3 py-2 btn-gold"
                      >
                        Ir a Órdenes
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card-metal p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold heading-racing text-neutral-100">
                {editing ? "Editar Cita" : "Nueva Cita"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Cliente *
                </label>
                <select
                  className="input-metal w-full"
                  value={form.client_id}
                  onChange={(e) =>
                    setForm({ ...form, client_id: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Servicio
                  </label>
                  <select
                    className="input-metal w-full"
                    value={form.service_id ?? ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      const svc = services.find((x) => x.id === val);
                      const dmin = svc?.duration_minutes ?? 60;
                      setForm({
                        ...form,
                        service_id: val,
                        duration_minutes: String(dmin),
                      });
                      setSelectedSlotKey(null);
                    }}
                  >
                    <option value="">(Opcional)</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Asignar mecánico
                  </label>
                  <select
                    className="input-metal w-full"
                    value={form.assigned_mechanic_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assigned_mechanic_id: e.target.value || null,
                      })
                    }
                  >
                    <option value="">(Opcional)</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    className="input-metal w-full"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlotKey(null);
                    }}
                    required
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="block text-sm text-neutral-400 mb-1">
                    Jornadas nocturnas
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const nv = !nightShiftsEnabled;
                      try {
                        const resp = await fetch(
                          `${ADMIN_BASE}/admin/appointments/night`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ enabled: nv }),
                          }
                        );
                        if (resp.ok) {
                          setNightShiftsEnabled(nv);
                          setSelectedSlotKey(null);
                        }
                      } catch (e) {
                        console.error(
                          "Error actualizando configuración nocturna:",
                          e
                        );
                      }
                    }}
                    className={`px-3 py-2 rounded flex items-center gap-2 ${
                      nightShiftsEnabled
                        ? "bg-amber-900/30 text-amber-400"
                        : "bg-neutral-800/50 text-neutral-400"
                    }`}
                  >
                    <Moon className="w-4 h-4" />{" "}
                    {nightShiftsEnabled ? "Activadas" : "Desactivadas"}
                  </button>
                </div>
              </div>
              {selectedDate && (
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Selecciona un turno *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {slotsForDate(selectedDate).map((s) => {
                      const startISO = buildSlotStartISO(selectedDate, s);
                      const end = buildSlotEnd(selectedDate, s);
                      const occupancy = dayAppointments.filter((a) => {
                        const st = new Date(a.scheduled_at);
                        return st >= new Date(startISO) && st < end;
                      });
                      const isFull = occupancy.length >= capacity;
                      const mechanicBusy = form.assigned_mechanic_id
                        ? occupancy.some(
                            (a) =>
                              a.assigned_mechanic_id ===
                              form.assigned_mechanic_id
                          )
                        : false;
                      return (
                        <button
                          type="button"
                          key={s.key}
                          onClick={() => setSelectedSlotKey(s.key)}
                          disabled={isFull || mechanicBusy}
                          className={`p-3 rounded border text-left transition-colors ${
                            selectedSlotKey === s.key
                              ? "border-amber-500 bg-amber-900/20"
                              : "border-neutral-700 bg-neutral-800/30"
                          } ${
                            isFull || mechanicBusy
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-neutral-800/50"
                          }`}
                        >
                          <div className="font-semibold text-neutral-100">
                            {s.label}
                          </div>
                          <div className="text-xs text-neutral-400">
                            Duración: {s.duration} min
                          </div>
                          <div className="text-xs text-neutral-400">
                            Ocupación: {occupancy.length}/{capacity}
                            {mechanicBusy ? " • Mecánico ocupado" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Notas
                </label>
                <textarea
                  className="input-metal w-full"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-800/50 text-neutral-300 rounded"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-gold">
                  {editing ? "Guardar" : "Crear Cita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOrderModal && orderModal.order && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card-metal p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold heading-racing text-neutral-100">
                Orden de Trabajo
              </h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 mb-6">
              <div className="text-neutral-300">ID: {orderModal.order.id}</div>
              <div className="text-neutral-300">
                Nº Orden:{" "}
                <span className="text-neutral-100 font-semibold">
                  {typeof orderModal.order.order_number === "number"
                    ? orderModal.order.order_number
                    : "—"}
                </span>
              </div>
              <div
                className={`text-sm uppercase tracking-wide px-2 py-1 rounded inline-block border ${
                  orderModal.order.status === "completed"
                    ? "bg-green-900/30 text-green-400 border-green-800/50"
                    : orderModal.order.status === "cancelled"
                    ? "bg-red-900/30 text-red-400 border-red-800/50"
                    : "bg-blue-900/30 text-blue-400 border-blue-800/50"
                }`}
              >
                {orderModal.order.status}
              </div>
              <div className="text-neutral-400 text-sm">
                Creada: {fmtDate(orderModal.order!.created_at)}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-neutral-100 mb-2">
                Servicios
              </h4>
              {orderModal.services.length === 0 ? (
                <p className="text-neutral-400">Sin servicios registrados</p>
              ) : (
                <ul className="space-y-2">
                  {orderModal.services.map((svc) => {
                    const svcInfo = services.find(
                      (ss) => ss.id === svc.service_id
                    );
                    return (
                      <li
                        key={svc.id}
                        className="flex justify-between items-center border border-neutral-700/50 rounded p-2"
                      >
                        <span className="text-neutral-200">
                          {svcInfo?.name || "Servicio"}
                          {svc.quantity ? ` × ${svc.quantity}` : ""}
                        </span>
                        {svc.unit_price !== null && (
                          <span className="text-neutral-400">
                            ${svc.unit_price}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 bg-neutral-800/50 text-neutral-300 rounded"
              >
                Cerrar
              </button>
              {onNavigateToOrders && (
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    onNavigateToOrders();
                  }}
                  className="btn-gold ml-2"
                >
                  Ir a Órdenes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
