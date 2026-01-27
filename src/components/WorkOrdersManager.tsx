import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Check,
  X,
  Trash2,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Printer,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import type { User } from "../lib/auth";
import { ADMIN_BASE } from "../lib/api";

type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type Mechanic = Database["public"]["Tables"]["users"]["Row"];
type InitialInspection =
  Database["public"]["Tables"]["initial_inspections"]["Row"];
type FinalInspection = Database["public"]["Tables"]["final_inspections"]["Row"];

type InitialFormState = {
  inspector_name: string;
  fecha_inspeccion: string;
  kilometraje_actual: string;
  combustible: "lleno" | "medio" | "bajo";
  nivel_aceite: "correcto" | "bajo" | "sucio";
  nivel_refrigerante: "correcto" | "bajo" | "no_aplica";
  bateria: "buena" | "debil" | "sin_carga";
  presion_neumaticos: "correcta" | "baja" | "alta";
  luces_alta: boolean;
  luces_baja: boolean;
  direccionales: boolean;
  stop: boolean;
  frenos: "firmes" | "esponjosos" | "requieren_ajuste";
  suspension_delantera: "sin_fugas" | "con_fugas" | "ruidosa";
  cadena_y_pinon: "buena" | "floja" | "desgastada";
  embrague: "normal" | "duro" | "patina";
  observaciones_generales: string;
  foto_recepcion_url: string | null;
  fotoFile: File | null;
};

type FinalFormState = {
  inspector_name: string;
  fecha_revision: string;
  servicios_realizados: string;
  prueba_arranque: boolean;
  ruidos_inusuales: boolean;
  luces_funcionando: boolean;
  frenos_operativos: boolean;
  direccion_sin_juego: boolean;
  nivel_aceite_correcto: boolean;
  sin_fugas_visibles: boolean;
  neumaticos_correctos: boolean;
  comentarios_finales: string;
  foto_entrega_url: string | null;
  firma_mecanico: string;
  fotoFile: File | null;
};

interface WorkOrderWithRelations extends WorkOrder {
  client: Client | null;
  service: Service | null;
  mechanic: Mechanic | null;
}

interface WorkOrdersManagerProps {
  user: User;
  onStatsUpdate: () => void;
}

const statusConfig = {
  pending: {
    label: "Pendiente",
    color: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
  },
  in_progress: {
    label: "En Proceso",
    color: "bg-blue-900/30 text-blue-400 border-blue-800/50",
  },
  completed: {
    label: "Completado",
    color: "bg-green-900/30 text-green-400 border-green-800/50",
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-900/30 text-red-400 border-red-800/50",
  },
};

export default function WorkOrdersManager({
  user,
  onStatsUpdate,
}: WorkOrdersManagerProps) {
  const [orders, setOrders] = useState<WorkOrderWithRelations[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [userMechanics, setUserMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<WorkOrderWithRelations | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    mechanic_id: "",
    notes: "",
    total: "",
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initialByOrder, setInitialByOrder] = useState<
    Record<string, InitialInspection | null>
  >({});
  const [finalByOrder, setFinalByOrder] = useState<
    Record<string, FinalInspection | null>
  >({});
  const [activeStepByOrder, setActiveStepByOrder] = useState<
    Record<string, "initial" | "service" | "final">
  >({});
  const [inspectionStatus, setInspectionStatus] = useState<
    Record<string, "green" | "yellow" | "red">
  >({});
  const [initialForms, setInitialForms] = useState<
    Record<string, InitialFormState>
  >({});
  const [finalForms, setFinalForms] = useState<Record<string, FinalFormState>>(
    {}
  );
  type WorkOrderServiceRow =
    Database["public"]["Tables"]["work_order_services"]["Row"];
  const [servicesByOrder, setServicesByOrder] = useState<
    Record<string, WorkOrderServiceRow[]>
  >({});
  const [newServiceRowByOrder, setNewServiceRowByOrder] = useState<
    Record<
      string,
      {
        service_id: string;
        quantity: string;
        unit_price: string;
        notes: string;
      }
    >
  >({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersResult, clientsResult, userMechsResult] =
        await Promise.all([
          supabase
            .from("work_orders")
            .select(
              `
            *,
            client:clients(*),
            service:services(*),
            mechanic:users(*)
          `
            )
            .order("created_at", { ascending: false }),
          supabase.from("clients").select("*").order("full_name"),
          supabase
            .from("users")
            .select("*")
            .eq("role", "mechanic")
            .eq("status", "active")
            .order("full_name"),
        ]);

      if (ordersResult.error) throw ordersResult.error;
      if (clientsResult.error) throw clientsResult.error;

      setOrders((ordersResult.data as WorkOrderWithRelations[]) || []);
      setClients(clientsResult.data || []);
      // Cargar servicios: intentar primero vía Supabase (RLS), fallback a backend admin
      try {
        const { data: svcData, error: svcErr } = await supabase
          .from("services")
          .select("*")
          .order("name");
        if (svcErr) throw svcErr;
        setServices((svcData || []) as Service[]);
      } catch (svcErr) {
        console.warn("Error cargando servicios desde supabase, intentando backend:", svcErr);
        try {
          const resp = await fetch(`${ADMIN_BASE}/admin/services`, {
            headers: { Accept: "application/json", "X-Role": "admin" },
          });
          if (!resp.ok) throw new Error(`Backend servicios fallo: ${resp.status}`);
          const json = await resp.json();
          setServices(json.services || []);
        } catch (be) {
          console.error("Error final cargando servicios:", be);
          setServices([]);
        }
      }

      // Mecánicos disponibles: intentar primero vía RLS; si lista vacía o error, usar backend admin
      let mechanicsList: Mechanic[] = [];
      if (!userMechsResult.error) {
        mechanicsList = ((userMechsResult.data as Mechanic[]) || []).filter(
          (m) =>
            (m as any)?.role === "mechanic" && (m as any)?.status === "active"
        );
      }
      if (!mechanicsList.length) {
        try {
          const resp = await fetch(`${ADMIN_BASE}/admin/users`, {
            headers: { Accept: "application/json", "X-Role": "admin" },
          });
          if (resp.ok) {
            const json = await resp.json();
            mechanicsList = ((json?.users || []) as any[]).filter(
              (u) => u.role === "mechanic" && u.status === "active"
            ) as any as Mechanic[];
          }
        } catch (e) {
          console.warn(
            "Backend admin no disponible para listar mecánicos:",
            (e as any)?.message || e
          );
        }
      }
      setUserMechanics(mechanicsList);

      // Load inspections for all orders to compute indicators
      const ids = ((ordersResult.data || []) as WorkOrderWithRelations[]).map(
        (o) => o.id
      );
      if (ids.length) {
        const [initRes, finalRes] = await Promise.all([
          supabase
            .from("initial_inspections")
            .select("*")
            .in("work_order_id", ids)
            .order("created_at", { ascending: false }),
          supabase
            .from("final_inspections")
            .select("*")
            .in("work_order_id", ids)
            .order("created_at", { ascending: false }),
        ]);

        const initialMap: Record<string, InitialInspection | null> = {};
        const finalMap: Record<string, FinalInspection | null> = {};

        ((initRes.data || []) as InitialInspection[]).forEach((row) => {
          if (!initialMap[row.work_order_id])
            initialMap[row.work_order_id] = row as InitialInspection;
        });
        ((finalRes.data || []) as FinalInspection[]).forEach((row) => {
          if (!finalMap[row.work_order_id])
            finalMap[row.work_order_id] = row as FinalInspection;
        });

        setInitialByOrder(initialMap);
        setFinalByOrder(finalMap);

        // Cargar servicios asociados a cada orden
        const wosRes = await supabase
          .from("work_order_services")
          .select("*")
          .in("work_order_id", ids)
          .order("created_at", { ascending: false });
        if (wosRes.error) throw wosRes.error;
        const wosMap: Record<string, WorkOrderServiceRow[]> = {};
        ((wosRes.data || []) as WorkOrderServiceRow[]).forEach((row) => {
          const oid = row.work_order_id;
          if (!wosMap[oid]) wosMap[oid] = [];
          wosMap[oid].push(row);
        });
        setServicesByOrder(wosMap);

        const statusMap: Record<string, "green" | "yellow" | "red"> = {};
        ids.forEach((id) => {
          const f = finalMap[id];
          const i = initialMap[id];
          if (f) {
            const allOk =
              f.prueba_arranque &&
              !f.ruidos_inusuales &&
              f.luces_funcionando &&
              f.frenos_operativos &&
              f.direccion_sin_juego &&
              f.nivel_aceite_correcto &&
              f.sin_fugas_visibles &&
              f.neumaticos_correctos &&
              f.estado_general === "apto";
            statusMap[id] = allOk ? "green" : "yellow";
          } else if (i) {
            statusMap[id] = "yellow";
          } else {
            statusMap[id] = "red";
          }
        });
        setInspectionStatus(statusMap);
      } else {
        setInitialByOrder({});
        setFinalByOrder({});
        setInspectionStatus({});
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const initInitialForm = (order: WorkOrderWithRelations) => {
    const current = initialByOrder[order.id];
    setInitialForms((prev) => ({
      ...prev,
      [order.id]: {
        inspector_name: current?.inspector_name || "",
        fecha_inspeccion: current?.fecha_inspeccion || new Date().toISOString(),
        kilometraje_actual: current?.kilometraje_actual || "",
        combustible: current?.combustible || "medio",
        nivel_aceite: current?.nivel_aceite || "correcto",
        nivel_refrigerante: current?.nivel_refrigerante || "correcto",
        bateria: current?.bateria || "buena",
        presion_neumaticos: current?.presion_neumaticos || "correcta",
        luces_alta: current?.luces_alta || false,
        luces_baja: current?.luces_baja || false,
        direccionales: current?.direccionales || false,
        stop: current?.stop || false,
        frenos: current?.frenos || "firmes",
        suspension_delantera: current?.suspension_delantera || "sin_fugas",
        cadena_y_pinon: current?.cadena_y_pinon || "buena",
        embrague: current?.embrague || "normal",
        observaciones_generales: current?.observaciones_generales || "",
        foto_recepcion_url: current?.foto_recepcion_url || null,
        fotoFile: null,
      },
    }));
  };

  const initFinalForm = (order: WorkOrderWithRelations) => {
    const current = finalByOrder[order.id];
    setFinalForms((prev) => ({
      ...prev,
      [order.id]: {
        inspector_name: current?.inspector_name || "",
        fecha_revision: current?.fecha_revision || new Date().toISOString(),
        servicios_realizados: current?.servicios_realizados || "",
        prueba_arranque: current?.prueba_arranque || false,
        ruidos_inusuales: current?.ruidos_inusuales || false,
        luces_funcionando: current?.luces_funcionando || false,
        frenos_operativos: current?.frenos_operativos || false,
        direccion_sin_juego: current?.direccion_sin_juego || false,
        nivel_aceite_correcto: current?.nivel_aceite_correcto || false,
        sin_fugas_visibles: current?.sin_fugas_visibles || false,
        neumaticos_correctos: current?.neumaticos_correctos || false,
        comentarios_finales: current?.comentarios_finales || "",
        foto_entrega_url: current?.foto_entrega_url || null,
        firma_mecanico: current?.firma_mecanico || "",
        fotoFile: null,
      },
    }));
  };

  const uploadImageToStorage = async (
    file: File,
    orderId: string,
    kind: "recepcion" | "entrega"
  ) => {
    try {
      const fileName = `${orderId}/${kind}-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("inspections")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
      const { data: pub } = await supabase.storage
        .from("inspections")
        .getPublicUrl(data.path);
      return pub.publicUrl;
    } catch (err) {
      console.warn("Upload failed or bucket missing:", err);
      return null;
    }
  };

  const saveInitial = async (order: WorkOrderWithRelations) => {
    const f = initialForms[order.id];
    try {
      let fotoUrl = f.foto_recepcion_url || null;
      if (f.fotoFile) {
        const uploaded = await uploadImageToStorage(
          f.fotoFile,
          order.id,
          "recepcion"
        );
        fotoUrl = uploaded || fotoUrl;
      }
      const payload = {
        work_order_id: order.id,
        inspector_name: f.inspector_name,
        mechanic_id: order.mechanic?.id || null,
        fecha_inspeccion: f.fecha_inspeccion,
        kilometraje_actual: f.kilometraje_actual
          ? Number(f.kilometraje_actual)
          : null,
        combustible: f.combustible,
        nivel_aceite: f.nivel_aceite,
        nivel_refrigerante: f.nivel_refrigerante,
        bateria: f.bateria,
        presion_neumaticos: f.presion_neumaticos,
        luces_alta: !!f.luces_alta,
        luces_baja: !!f.luces_baja,
        direccionales: !!f.direccionales,
        stop: !!f.stop,
        frenos: f.frenos,
        suspension_delantera: f.suspension_delantera,
        cadena_y_pinon: f.cadena_y_pinon,
        embrague: f.embrague,
        observaciones_generales: f.observaciones_generales || null,
        foto_recepcion_url: fotoUrl,
      } as Database["public"]["Tables"]["initial_inspections"]["Insert"];

      if (initialByOrder[order.id]) {
        const { error } = await supabase
          .from("initial_inspections")
          .update({ ...payload, fecha_inspeccion: new Date().toISOString() })
          .eq("id", initialByOrder[order.id]!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("initial_inspections")
          .insert([payload]);
        if (error) throw error;
      }
      await loadData();
      // Tras guardar la inspección inicial: abrir la orden (En Proceso) y avanzar al paso Orden de Servicio
      if (order.status === "pending") {
        await handleStatusChange(order.id, "in_progress");
      }
      setActiveStepByOrder((s) => ({ ...s, [order.id]: "service" }));
      alert("Inspección inicial guardada");
    } catch (err) {
      console.error("Error guardando inspección inicial:", err);
      alert("No se pudo guardar la inspección inicial");
    }
  };

  const saveFinal = async (order: WorkOrderWithRelations) => {
    const f = finalForms[order.id];
    try {
      let fotoUrl = f.foto_entrega_url || null;
      if (f.fotoFile) {
        const uploaded = await uploadImageToStorage(
          f.fotoFile,
          order.id,
          "entrega"
        );
        fotoUrl = uploaded || fotoUrl;
      }
      const estado_general: "apto" | "observado" =
        f.prueba_arranque &&
          !f.ruidos_inusuales &&
          f.luces_funcionando &&
          f.frenos_operativos &&
          f.direccion_sin_juego &&
          f.nivel_aceite_correcto &&
          f.sin_fugas_visibles &&
          f.neumaticos_correctos
          ? "apto"
          : "observado";
      const payload = {
        work_order_id: order.id,
        inspector_name: f.inspector_name,
        mechanic_id: order.mechanic?.id || null,
        fecha_revision: f.fecha_revision,
        servicios_realizados: f.servicios_realizados || null,
        prueba_arranque: !!f.prueba_arranque,
        ruidos_inusuales: !!f.ruidos_inusuales,
        luces_funcionando: !!f.luces_funcionando,
        frenos_operativos: !!f.frenos_operativos,
        direccion_sin_juego: !!f.direccion_sin_juego,
        nivel_aceite_correcto: !!f.nivel_aceite_correcto,
        sin_fugas_visibles: !!f.sin_fugas_visibles,
        neumaticos_correctos: !!f.neumaticos_correctos,
        comentarios_finales: f.comentarios_finales || null,
        foto_entrega_url: fotoUrl,
        estado_general,
        firma_mecanico: f.firma_mecanico || null,
      } as Database["public"]["Tables"]["final_inspections"]["Insert"];

      if (finalByOrder[order.id]) {
        const { error } = await supabase
          .from("final_inspections")
          .update({ ...payload, fecha_revision: new Date().toISOString() })
          .eq("id", finalByOrder[order.id]!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("final_inspections")
          .insert([payload]);
        if (error) throw error;
      }
      await loadData();
      alert("Inspección final guardada");
    } catch (err) {
      console.error("Error guardando inspección final:", err);
      alert("No se pudo guardar la inspección final");
    }
  };

  const deleteWorkOrder = async (orderId: string) => {
    if (
      !confirm(
        "¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer."
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("work_orders")
        .delete()
        .eq("id", orderId);
      if (error) throw error;
      await loadData();
      alert("Orden eliminada");
    } catch (err) {
      console.error("Error eliminando orden:", err);
      alert("No se pudo eliminar la orden");
    }
  };

  const openFinalInspectionPDF = (order: WorkOrderWithRelations) => {
    const f: FinalInspection | null = finalByOrder[order.id] || null;
    if (!f) {
      alert("Primero guarde la Inspección Final.");
      return;
    }
    const client =
      order.client || clients.find((c) => c.id === order.client_id) || null;
    const win = window.open("", "_blank");
    if (!win) return;
    const statusEmoji = f.estado_general === "apto" ? "🟢" : "🟡";
    win.document.write(`
      <html>
        <head>
          <title>Inspección Final - Motocadena</title>
          <style>
            body{font-family:Arial, sans-serif;padding:24px;color:#111}
            .header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
            .tag{padding:4px 8px;border-radius:6px;border:1px solid #ccc;display:inline-block}
            .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
            .box{border:1px solid #ddd;border-radius:8px;padding:12px;margin-top:8px}
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logomotocadena.png" alt="Motocadena" style="width:80px;height:80px;object-fit:contain" />
            <div>
              <h2 style="margin:0">Motocadena - Resumen de Inspección Final</h2>
              <div class="tag">Estado general: ${f.estado_general.toUpperCase()} ${statusEmoji}</div>
            </div>
          </div>
          <div class="box">
            <strong>Cliente:</strong> ${client?.full_name || ""
      } | <strong>Tel:</strong> ${client?.phone || ""}<br />
            <strong>Vehículo:</strong> ${client?.vehicle_brand || ""} ${client?.vehicle_model || ""
      } | <strong>Placa:</strong> ${client?.vehicle_plate || ""}<br />
            <strong>Orden:</strong> ${order.service?.name || ""
      } | <strong>Fecha:</strong> ${new Date(
        f.fecha_revision
      ).toLocaleString()}<br />
            <strong>Mecánico responsable:</strong> ${order.mechanic?.full_name || ""
      }
          </div>
          <div class="box">
            <div class="grid">
              <div>Prueba arranque: ${f.prueba_arranque ? "✅" : "❌"}</div>
              <div>Ruidos inusuales: ${f.ruidos_inusuales ? "⚠️" : "✅"}</div>
              <div>Luces funcionando: ${f.luces_funcionando ? "✅" : "❌"}</div>
              <div>Frenos operativos: ${f.frenos_operativos ? "✅" : "❌"}</div>
              <div>Dirección sin juego: ${f.direccion_sin_juego ? "✅" : "❌"
      }</div>
              <div>Nivel de aceite correcto: ${f.nivel_aceite_correcto ? "✅" : "❌"
      }</div>
              <div>Sin fugas visibles: ${f.sin_fugas_visibles ? "✅" : "❌"
      }</div>
              <div>Neumáticos correctos: ${f.neumaticos_correctos ? "✅" : "❌"
      }</div>
            </div>
          </div>
          <div class="box">
            <strong>Servicios realizados</strong><br />
            <div>${(f.servicios_realizados || "").replace(/\n/g, "<br/>")}</div>
          </div>
          <div class="box">
            <strong>Comentarios finales</strong><br />
            <div>${(f.comentarios_finales || "").replace(/\n/g, "<br/>")}</div>
          </div>
          <div class="box">
            <strong>Firma digital del mecánico:</strong> ${f.firma_mecanico || ""
      }
          </div>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Construir payload evitando enviar campos vacíos/null que disparen errores 400
      const totalNumber = parseFloat(formData.total);
      if (!editingOrder && !formData.service_id) {
        alert("Selecciona un servicio principal para crear la orden");
        return;
      }
      const orderData: any = {
        client_id: formData.client_id,
        notes: formData.notes,
        total: isNaN(totalNumber) ? 0 : totalNumber,
        status: editingOrder?.status || "pending",
      };

      if (formData.service_id) {
        orderData.service_id = formData.service_id;
      }
      if (formData.mechanic_id) {
        orderData.mechanic_id = formData.mechanic_id;
      }

      if (editingOrder) {
        const { error } = await supabase
          .from("work_orders")
          .update({ ...orderData, updated_at: new Date().toISOString() })
          .eq("id", editingOrder.id);

        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("work_orders")
          .insert([orderData])
          .select("*")
          .single();

        if (error) throw error;
        if (inserted?.id) {
          // Abrir la orden recién creada y llevar a Inspección Inicial
          setExpandedId(inserted.id);
        }
      }

      setShowModal(false);
      resetForm();
      loadData();
      onStatsUpdate();
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Error al guardar la orden");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      loadData();
      onStatsUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error al actualizar el estado");
    }
  };

  const handleAssignMechanic = async (
    orderId: string,
    mechanicId: string | null
  ) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          mechanic_id: mechanicId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error assigning mechanic:", error);
      alert("Error al asignar el mecánico");
    }
  };

  const handleEdit = (order: WorkOrderWithRelations) => {
    setEditingOrder(order);
    setFormData({
      client_id: order.client_id,
      service_id: order.service_id,
      mechanic_id: order.mechanic_id || "",
      notes: order.notes || "",
      total: order.total.toString(),
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      service_id: "",
      mechanic_id: "",
      notes: "",
      total: "",
    });
    setEditingOrder(null);
  };

  const handleServiceChange = (serviceId: string) => {
    setFormData({ ...formData, service_id: serviceId });
    const service = services.find((s) => s.id === serviceId);
    if (service && !formData.total) {
      setFormData((prev) => ({
        ...prev,
        total: service.base_price.toString(),
        service_id: serviceId,
      }));
    }
  };

  const setNewServiceField = (
    orderId: string,
    field: "service_id" | "quantity" | "unit_price" | "notes",
    value: string
  ) => {
    setNewServiceRowByOrder((prev) => ({
      ...prev,
      [orderId]: {
        service_id: prev[orderId]?.service_id || "",
        quantity: prev[orderId]?.quantity || "1",
        unit_price: prev[orderId]?.unit_price || "",
        notes: prev[orderId]?.notes || "",
        [field]: value,
      },
    }));
  };

  const addOrderService = async (orderId: string) => {
    try {
      const payload = newServiceRowByOrder[orderId];
      if (!payload?.service_id) {
        alert("Selecciona un servicio para agregar");
        return;
      }

      const quantityNum = parseInt(payload.quantity || "1", 10);
      const unitPriceNum = parseFloat(
        payload.unit_price ||
        services
          .find((s) => s.id === payload.service_id)
          ?.base_price.toString() ||
        "0"
      );

      const { error } = await supabase.from("work_order_services").insert([
        {
          work_order_id: orderId,
          service_id: payload.service_id,
          quantity: quantityNum,
          unit_price: unitPriceNum,
          notes: payload.notes || null,
        },
      ]);
      if (error) throw error;
      // Limpiar entrada y recargar datos para reflejar total actualizado por trigger
      setNewServiceRowByOrder((prev) => ({
        ...prev,
        [orderId]: { service_id: "", quantity: "1", unit_price: "", notes: "" },
      }));
      loadData();
    } catch (error) {
      console.error("Error agregando servicio a la orden:", error);
      alert("Error al agregar servicio");
    }
  };

  const deleteOrderService = async (orderId: string, wosId: string) => {
    try {
      const { error } = await supabase
        .from("work_order_services")
        .delete()
        .eq("id", wosId);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error eliminando servicio de la orden:", error);
      alert("Error al eliminar servicio");
    }
  };

  const roleOrders =
    user.role === "mechanic"
      ? orders.filter((order) => order.mechanic_id === user.id)
      : orders;
  const filteredOrders =
    filterStatus === "all"
      ? roleOrders
      : roleOrders.filter((order) => order.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold heading-racing text-neutral-100 mb-2">
            ÓRDENES DE TRABAJO
          </h2>
          <p className="text-neutral-400 text-racing">
            Gestión de servicios y reparaciones
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          NUEVA ORDEN
        </button>
      </div>

      <div className="card-metal p-4 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded text-sm font-semibold uppercase tracking-wide transition-all ${filterStatus === "all" ? "btn-gold" : "btn-metal"
              }`}
          >
            Todas ({orders.length})
          </button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded text-sm font-semibold uppercase tracking-wide transition-all whitespace-nowrap ${filterStatus === status ? config.color + " border" : "btn-metal"
                }`}
            >
              {config.label} ({orders.filter((o) => o.status === status).length}
              )
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card-metal p-12 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card-metal p-12 text-center">
          <p className="text-neutral-400">No hay órdenes de trabajo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="card-metal p-6 hover:brightness-110 transition-all duration-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {(() => {
                        const displayClient =
                          order.client ||
                          clients.find((c) => c.id === order.client_id);
                        return (
                          <h3 className="text-xl font-bold text-neutral-100 mb-1">
                            {displayClient?.full_name || "Cliente desconocido"}
                          </h3>
                        );
                      })()}
                      <p className="text-amber-400 font-semibold">
                        {order.service?.name || "Servicio desconocido"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded text-sm font-semibold uppercase tracking-wide border ${statusConfig[order.status].color
                          }`}
                      >
                        {statusConfig[order.status].label}
                      </span>
                      <span title="Estado por inspección" className="text-xl">
                        {inspectionStatus[order.id] === "green"
                          ? "🟢"
                          : inspectionStatus[order.id] === "yellow"
                            ? "🟡"
                            : "🔴"}
                      </span>
                      <button
                        onClick={() => {
                          const willExpand = expandedId !== order.id;
                          setExpandedId(willExpand ? order.id : null);
                          if (willExpand) {
                            initInitialForm(order);
                            initFinalForm(order);
                            setActiveStepByOrder((s) => ({
                              ...s,
                              [order.id]: !initialByOrder[order.id]
                                ? "initial"
                                : order.status === "completed" ||
                                  finalByOrder[order.id]
                                  ? "final"
                                  : "service",
                            }));
                          }
                        }}
                        className="p-2 bg-neutral-800/60 text-neutral-300 rounded hover:bg-neutral-700/60 transition-colors"
                      >
                        {expandedId === order.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-neutral-400">
                    <div>
                      <span className="text-neutral-500">Nº Orden:</span>{" "}
                      <span className="text-neutral-200 font-semibold">
                        {typeof order.order_number === "number"
                          ? order.order_number
                          : "—"}
                      </span>
                    </div>
                    {order.mechanic && (
                      <div>
                        <span className="text-neutral-500">Mecánico:</span>{" "}
                        <span className="text-neutral-200">
                          {order.mechanic?.full_name}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-neutral-500">Total:</span>{" "}
                      <span className="text-amber-400 font-semibold">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(order.created_at).toLocaleDateString()}{" "}
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-3 p-3 bg-neutral-900/50 rounded border border-neutral-700/50">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-neutral-500 mt-0.5" />
                        <p className="text-sm text-neutral-300">
                          {order.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {expandedId === order.id && (
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Encabezado de pasos */}
                      <div className="lg:col-span-2 mb-1">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-400">
                          <span className="px-2 py-1 rounded border border-neutral-700 bg-neutral-900/40 text-neutral-200">
                            Inspección Inicial
                          </span>
                          <span className="text-neutral-600">→</span>
                          <span className="px-2 py-1 rounded border border-neutral-700 bg-neutral-900/40 text-neutral-200">
                            Orden de Servicio
                          </span>
                          <span className="text-neutral-600">→</span>
                          <span className="px-2 py-1 rounded border border-neutral-700 bg-neutral-900/40 text-neutral-200">
                            Inspección Final
                          </span>
                        </div>
                      </div>

                      {/* Asignación rápida de mecánico (usuarios con rol mechanic) */}
                      <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                          <div className="md:col-span-1">
                            <label className="label-metal">
                              Asignar mecánico (usuario)
                            </label>
                            <select
                              className="input-metal w-full"
                              value={order.mechanic_id || ""}
                              onChange={(e) =>
                                handleAssignMechanic(
                                  order.id,
                                  e.target.value || null
                                )
                              }
                            >
                              <option value="">Sin asignar</option>
                              {userMechanics.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      {/* Inspección Inicial */}
                      {activeStepByOrder[order.id] === "initial" && (
                        <div className="p-4 border border-neutral-700 rounded bg-neutral-900/40">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-neutral-100">
                              Inspección de Entrada
                            </h4>
                            <span className="text-neutral-500 text-sm">
                              {new Date(
                                initialByOrder[order.id]?.fecha_inspeccion ||
                                Date.now()
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label-metal">Inspector</label>
                              <input
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.inspector_name || ""
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      inspector_name: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="label-metal">Kilometraje</label>
                              <input
                                type="number"
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.kilometraje_actual ||
                                  ""
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      kilometraje_actual: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="label-metal">Combustible</label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.combustible || "medio"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      combustible: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="lleno">Lleno</option>
                                <option value="medio">Medio</option>
                                <option value="bajo">Bajo</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">
                                Nivel de aceite
                              </label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.nivel_aceite ||
                                  "correcto"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      nivel_aceite: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="correcto">Correcto</option>
                                <option value="bajo">Bajo</option>
                                <option value="sucio">Sucio</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">
                                Refrigerante
                              </label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.nivel_refrigerante ||
                                  "correcto"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      nivel_refrigerante: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="correcto">Correcto</option>
                                <option value="bajo">Bajo</option>
                                <option value="no_aplica">No aplica</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">Batería</label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.bateria || "buena"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      bateria: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="buena">Buena</option>
                                <option value="debil">Débil</option>
                                <option value="sin_carga">Sin carga</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">
                                Presión neumáticos
                              </label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.presion_neumaticos ||
                                  "correcta"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      presion_neumaticos: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="correcta">Correcta</option>
                                <option value="baja">Baja</option>
                                <option value="alta">Alta</option>
                              </select>
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="label-metal">Luces</label>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { k: "luces_alta", label: "Alta" },
                                { k: "luces_baja", label: "Baja" },
                                { k: "direccionales", label: "Direccionales" },
                                { k: "stop", label: "Stop" },
                              ].map((c) => (
                                <button
                                  key={c.k}
                                  onClick={() =>
                                    setInitialForms((p) => ({
                                      ...p,
                                      [order.id]: {
                                        ...p[order.id],
                                        [c.k]: !p[order.id]?.[c.k],
                                      },
                                    }))
                                  }
                                  className={`px-3 py-1 rounded border transition ${initialForms[order.id]?.[c.k]
                                      ? "bg-green-900/40 border-green-700 text-green-300"
                                      : "bg-neutral-800/40 border-neutral-700 text-neutral-300"
                                    }`}
                                >
                                  {initialForms[order.id]?.[c.k] ? "✅" : "⚠️"}{" "}
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="label-metal">Frenos</label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.frenos || "firmes"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      frenos: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="firmes">Firmes</option>
                                <option value="esponjosos">Esponjosos</option>
                                <option value="requieren_ajuste">
                                  Requieren ajuste
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">
                                Suspensión delantera
                              </label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]
                                    ?.suspension_delantera || "sin_fugas"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      suspension_delantera: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="sin_fugas">Sin fugas</option>
                                <option value="con_fugas">Con fugas</option>
                                <option value="ruidosa">Ruidosa</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">
                                Cadena y piñón
                              </label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.cadena_y_pinon ||
                                  "buena"
                                }
                                onChange={(e) =>
                                  setInitialForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      cadena_y_pinon: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="buena">Buena</option>
                                <option value="floja">Floja</option>
                                <option value="desgastada">Desgastada</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">Embrague</label>
                              <select
                                className="input-metal w-full"
                                value={
                                  initialForms[order.id]?.embrague || "normal"
                                }
                                onChange={(e) =>
                                  setInitialForms((p: any) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      embrague: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="normal">Normal</option>
                                <option value="duro">Duro</option>
                                <option value="patina">Patina</option>
                              </select>
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="label-metal">Observaciones</label>
                            <textarea
                              className="input-metal w-full h-20"
                              value={
                                initialForms[order.id]
                                  ?.observaciones_generales || ""
                              }
                              onChange={(e) =>
                                setInitialForms((p) => ({
                                  ...p,
                                  [order.id]: {
                                    ...p[order.id],
                                    observaciones_generales: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="mt-3">
                            <label className="label-metal flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" /> Foto de
                              recepción (opcional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              className="input-metal w-full"
                              onChange={(e) =>
                                setInitialForms((p) => ({
                                  ...p,
                                  [order.id]: {
                                    ...p[order.id],
                                    fotoFile: e.target.files?.[0] || null,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => saveInitial(order)}
                              className="btn-gold"
                            >
                              Guardar Inspección Inicial
                            </button>
                            <button
                              onClick={() => window.print()}
                              className="btn-metal flex items-center gap-2"
                            >
                              <Printer className="w-4 h-4" /> Imprimir checklist
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Orden de Servicio */}
                      {activeStepByOrder[order.id] === "service" && (
                        <div className="p-4 border border-neutral-700 rounded bg-neutral-900/40">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-neutral-100">
                              Orden de Servicio
                            </h4>
                            <span className="text-neutral-500 text-sm">
                              Total actualizado automáticamente por servicios
                            </span>
                          </div>

                          {/* Listado de servicios agregados a la orden */}
                          <div className="space-y-2 mb-4">
                            {(servicesByOrder[order.id] || []).length === 0 && (
                              <div className="text-sm text-neutral-400">
                                Sin servicios adicionales
                              </div>
                            )}
                            {(servicesByOrder[order.id] || []).map((row) => {
                              const svc = services.find(
                                (s) => s.id === row.service_id
                              );
                              const subtotal = row.quantity * row.unit_price;
                              return (
                                <div
                                  key={row.id}
                                  className="p-3 border border-neutral-700 rounded bg-neutral-950/40 flex items-center justify-between"
                                >
                                  <div>
                                    <div className="text-neutral-100 font-semibold">
                                      {svc?.name || row.service_id}
                                    </div>
                                    <div className="text-xs text-neutral-400">
                                      Cantidad: {row.quantity} · Precio: $
                                      {row.unit_price.toFixed(2)} · Subtotal: $
                                      {subtotal.toFixed(2)}
                                    </div>
                                    {row.notes && (
                                      <div className="text-xs text-neutral-300 mt-1">
                                        {row.notes}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      deleteOrderService(order.id, row.id)
                                    }
                                    className="btn-metal"
                                    title="Eliminar servicio"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Agregar nuevo servicio a la orden */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                              <label className="label-metal">Servicio</label>
                              <select
                                className="input-metal w-full"
                                value={
                                  newServiceRowByOrder[order.id]?.service_id ||
                                  ""
                                }
                                onChange={(e) =>
                                  setNewServiceField(
                                    order.id,
                                    "service_id",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Selecciona servicio…</option>
                                {services.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="label-metal">Cantidad</label>
                              <input
                                type="number"
                                min={1}
                                className="input-metal w-full"
                                value={
                                  newServiceRowByOrder[order.id]?.quantity ||
                                  "1"
                                }
                                onChange={(e) =>
                                  setNewServiceField(
                                    order.id,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="label-metal">
                                Precio Unitario
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                className="input-metal w-full"
                                value={
                                  newServiceRowByOrder[order.id]?.unit_price ||
                                  ""
                                }
                                onChange={(e) =>
                                  setNewServiceField(
                                    order.id,
                                    "unit_price",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="label-metal">Notas</label>
                              <input
                                className="input-metal w-full"
                                value={
                                  newServiceRowByOrder[order.id]?.notes || ""
                                }
                                onChange={(e) =>
                                  setNewServiceField(
                                    order.id,
                                    "notes",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => addOrderService(order.id)}
                              className="btn-gold"
                            >
                              Agregar servicio
                            </button>
                            <button
                              onClick={() =>
                                setActiveStepByOrder((p) => ({
                                  ...p,
                                  [order.id]: "final",
                                }))
                              }
                              className="btn-metal"
                            >
                              Continuar a Inspección Final
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inspección Final */}
                      {(order.status === "completed" ||
                        finalByOrder[order.id]) && (
                          <div className="p-4 border border-neutral-700 rounded bg-neutral-900/40">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-bold text-neutral-100">
                                Inspección de Salida
                              </h4>
                              <span className="text-neutral-500 text-sm">
                                {new Date(
                                  finalByOrder[order.id]?.fecha_revision ||
                                  Date.now()
                                ).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="label-metal">Inspector</label>
                                <input
                                  className="input-metal w-full"
                                  value={
                                    finalForms[order.id]?.inspector_name || ""
                                  }
                                  onChange={(e) =>
                                    setFinalForms((p) => ({
                                      ...p,
                                      [order.id]: {
                                        ...p[order.id],
                                        inspector_name: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="label-metal">
                                  Servicios realizados
                                </label>
                                <textarea
                                  className="input-metal w-full h-20"
                                  value={
                                    finalForms[order.id]?.servicios_realizados ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setFinalForms((p) => ({
                                      ...p,
                                      [order.id]: {
                                        ...p[order.id],
                                        servicios_realizados: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[
                                {
                                  k: "prueba_arranque",
                                  label: "Prueba arranque",
                                },
                                {
                                  k: "ruidos_inusuales",
                                  label: "Ruidos inusuales",
                                },
                                {
                                  k: "luces_funcionando",
                                  label: "Luces funcionando",
                                },
                                {
                                  k: "frenos_operativos",
                                  label: "Frenos operativos",
                                },
                                {
                                  k: "direccion_sin_juego",
                                  label: "Dirección sin juego",
                                },
                                {
                                  k: "nivel_aceite_correcto",
                                  label: "Nivel de aceite correcto",
                                },
                                {
                                  k: "sin_fugas_visibles",
                                  label: "Sin fugas visibles",
                                },
                                {
                                  k: "neumaticos_correctos",
                                  label: "Neumáticos correctos",
                                },
                              ].map((c) => (
                                <button
                                  key={c.k}
                                  onClick={() =>
                                    setFinalForms((p) => ({
                                      ...p,
                                      [order.id]: {
                                        ...p[order.id],
                                        [c.k]: !p[order.id]?.[c.k],
                                      },
                                    }))
                                  }
                                  className={`px-3 py-2 rounded border text-left transition ${finalForms[order.id]?.[c.k]
                                      ? "bg-green-900/40 border-green-700 text-green-300"
                                      : "bg-neutral-800/40 border-neutral-700 text-neutral-300"
                                    }`}
                                >
                                  {finalForms[order.id]?.[c.k] ? "✅" : "⚠️"}{" "}
                                  {c.label}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="label-metal">
                                  Comentarios finales
                                </label>
                                <textarea
                                  className="input-metal w-full h-20"
                                  value={
                                    finalForms[order.id]?.comentarios_finales ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setFinalForms((p) => ({
                                      ...p,
                                      [order.id]: {
                                        ...p[order.id],
                                        comentarios_finales: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="label-metal">
                                  Firma digital (nombre)
                                </label>
                                <input
                                  className="input-metal w-full"
                                  value={
                                    finalForms[order.id]?.firma_mecanico || ""
                                  }
                                  onChange={(e) =>
                                    setFinalForms((p) => ({
                                      ...p,
                                      [order.id]: {
                                        ...p[order.id],
                                        firma_mecanico: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="label-metal flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> Foto de entrega
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                className="input-metal w-full"
                                onChange={(e) =>
                                  setFinalForms((p) => ({
                                    ...p,
                                    [order.id]: {
                                      ...p[order.id],
                                      fotoFile: e.target.files?.[0] || null,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => saveFinal(order)}
                                className="btn-gold"
                              >
                                Guardar Inspección Final
                              </button>
                              <button
                                onClick={() => openFinalInspectionPDF(order)}
                                className="btn-metal flex items-center gap-2"
                              >
                                <Printer className="w-4 h-4" /> Descargar PDF
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="flex lg:flex-col gap-2">
                  <button
                    onClick={() => handleEdit(order)}
                    className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {order.status === "pending" && (
                    <button
                      onClick={() =>
                        handleStatusChange(order.id, "in_progress")
                      }
                      className="p-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors"
                      title="Iniciar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {order.status === "in_progress" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "completed")}
                      className="p-2 bg-green-900/30 text-green-400 rounded hover:bg-green-900/50 transition-colors"
                      title="Completar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {(order.status === "pending" ||
                    order.status === "in_progress") && (
                      <button
                        onClick={() => handleStatusChange(order.id, "cancelled")}
                        className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                  {/* Eliminar orden de servicio */}
                  <button
                    onClick={() => deleteWorkOrder(order.id)}
                    className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                    title="Eliminar orden"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="card-metal p-8 max-w-2xl w-full my-8">
            <h3 className="text-2xl font-bold heading-racing text-neutral-100 mb-6">
              {editingOrder ? "EDITAR ORDEN" : "NUEVA ORDEN"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Cliente *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData({ ...formData, client_id: e.target.value })
                  }
                  className="input-metal w-full"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} - {client.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Servicio principal requerido mientras service_id sea NOT NULL en BD */}
              {!editingOrder && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                    Servicio principal *
                  </label>
                  <select
                    value={formData.service_id}
                    onChange={(e) =>
                      setFormData({ ...formData, service_id: e.target.value })
                    }
                    className="input-metal w-full"
                    required
                  >
                    <option value="">Seleccionar servicio...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Mecánico (usuario)
                </label>
                <select
                  value={formData.mechanic_id}
                  onChange={(e) =>
                    setFormData({ ...formData, mechanic_id: e.target.value })
                  }
                  className="input-metal w-full"
                >
                  <option value="">Sin asignar</option>
                  {userMechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide"></label>
                {/* Mecánico Asignado (operador) removido para evitar dependencias a tabla inexistente */}
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Total *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total}
                  onChange={(e) =>
                    setFormData({ ...formData, total: e.target.value })
                  }
                  className="input-metal w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="input-metal w-full h-24 resize-none"
                  placeholder="Observaciones, detalles adicionales..."
                />
              </div>

              {/* Gestión de servicios directamente en el modal de edición */}
              {editingOrder ? (
                <div className="mt-6">
                  <h4 className="text-lg font-bold text-neutral-100 mb-2">
                    Servicios de la orden
                  </h4>
                  <div className="space-y-2">
                    {!servicesByOrder[editingOrder.id]?.length && (
                      <div className="text-sm text-neutral-400">
                        Sin servicios adicionales
                      </div>
                    )}
                    {(servicesByOrder[editingOrder.id] || []).map((row) => {
                      const svc = services.find((s) => s.id === row.service_id);
                      const subtotal = row.quantity * row.unit_price;
                      return (
                        <div
                          key={row.id}
                          className="p-3 border border-neutral-700 rounded bg-neutral-950/40 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-neutral-100 font-semibold">
                              {svc?.name || row.service_id}
                            </div>
                            <div className="text-xs text-neutral-400">
                              Cantidad: {row.quantity} · Precio: $
                              {row.unit_price.toFixed(2)} · Subtotal: $
                              {subtotal.toFixed(2)}
                            </div>
                            {row.notes && (
                              <div className="text-xs text-neutral-300 mt-1">
                                {row.notes}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              deleteOrderService(editingOrder.id, row.id)
                            }
                            className="btn-metal"
                            title="Eliminar servicio"
                          >
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Agregar nuevo servicio a la orden */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-3">
                    <div>
                      <label className="label-metal">Servicio</label>
                      <select
                        className="input-metal w-full"
                        value={
                          newServiceRowByOrder[editingOrder.id]?.service_id ||
                          ""
                        }
                        onChange={(e) =>
                          setNewServiceField(
                            editingOrder.id,
                            "service_id",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Selecciona servicio…</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-metal">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        className="input-metal w-full"
                        value={
                          newServiceRowByOrder[editingOrder.id]?.quantity || "1"
                        }
                        onChange={(e) =>
                          setNewServiceField(
                            editingOrder.id,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="label-metal">Precio Unitario</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-metal w-full"
                        value={
                          newServiceRowByOrder[editingOrder.id]?.unit_price ||
                          ""
                        }
                        onChange={(e) =>
                          setNewServiceField(
                            editingOrder.id,
                            "unit_price",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="label-metal">Notas</label>
                      <input
                        className="input-metal w-full"
                        value={
                          newServiceRowByOrder[editingOrder.id]?.notes || ""
                        }
                        onChange={(e) =>
                          setNewServiceField(
                            editingOrder.id,
                            "notes",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => addOrderService(editingOrder.id)}
                      className="btn-gold"
                    >
                      Agregar servicio
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    Los cambios se guardan al instante y el total se actualiza.
                  </p>
                </div>
              ) : (
                <div className="mt-6 text-sm text-neutral-400">
                  Los servicios adicionales se pueden agregar después de crear
                  la orden.
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-gold flex-1">
                  {editingOrder ? "ACTUALIZAR" : "CREAR ORDEN"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-metal flex-1"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
