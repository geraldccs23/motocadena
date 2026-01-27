const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

function normalizePlate(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

function statusLabel(status) {
  const map = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };
  return map[status] || status;
}

exports.getByPlate = async (req, res, next) => {
  try {
    const rawPlate = req.params.plate;
    if (!rawPlate || !rawPlate.trim()) throw makeError(400, 'Placa requerida');
    const plateExact = rawPlate.trim().toUpperCase();
    const plateNorm = normalizePlate(rawPlate);

    // Buscar vehículo por placa (exacto, case-insensitive)
    let { data: vehicles, error: vErr } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('plate', plateExact)
      .limit(1);
    if (vErr) throw makeError(500, vErr.message);

    // Fallback: intentar por coincidencia parcial removiendo guiones/espacios
    if (!vehicles || vehicles.length === 0) {
      const pattern = `%${plateNorm}%`;
      const { data: v2, error: v2Err } = await supabase
        .from('vehicles')
        .select('*')
        .ilike('plate', pattern)
        .limit(1);
      if (v2Err) throw makeError(500, v2Err.message);
      vehicles = v2 || [];
    }

    const vehicle = vehicles?.[0];
    if (!vehicle) throw makeError(404, 'No se encontró vehículo con esa placa', 'NOT_FOUND');

    // Cliente
    const { data: client, error: cErr } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('id', vehicle.client_id)
      .single();
    if (cErr) throw makeError(500, cErr.message);

    // Última orden del cliente
    const { data: orders, error: oErr } = await supabase
      .from('work_orders')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (oErr) throw makeError(500, oErr.message);
    const order = orders?.[0] || null;

    // Servicios asociados (si hay orden)
    let services = [];
    let inspections = { initial: false, final: false };
    if (order) {
      const [{ data: items, error: iErr }, { data: initial, error: i1Err }, { data: final, error: fErr }] = await Promise.all([
        supabase.from('work_order_services').select('*').eq('work_order_id', order.id),
        supabase.from('initial_inspections').select('id').eq('work_order_id', order.id).limit(1),
        supabase.from('final_inspections').select('id').eq('work_order_id', order.id).limit(1),
      ]);
      if (iErr) throw makeError(500, iErr.message);
      if (i1Err) throw makeError(500, i1Err.message);
      if (fErr) throw makeError(500, fErr.message);
      inspections = { initial: !!(initial && initial.length), final: !!(final && final.length) };

      // Enriquecer con nombre del servicio
      const serviceIds = (items || []).map((it) => it.service_id);
      let namesById = {};
      if (serviceIds.length) {
        const { data: svcRows, error: sErr } = await supabase
          .from('services')
          .select('id, name')
          .in('id', serviceIds);
        if (sErr) throw makeError(500, sErr.message);
        (svcRows || []).forEach((s) => { namesById[s.id] = s.name; });
      }
      services = (items || []).map((it) => ({
        service_id: it.service_id,
        name: namesById[it.service_id],
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));
    }

    const response = {
      client: {
        id: client.id,
        full_name: client.full_name,
        vehicle_plate: vehicle.plate,
        vehicle_brand: vehicle.brand,
        vehicle_model: vehicle.model,
      },
      order: order
        ? {
            id: order.id,
            status: order.status,
            status_label: statusLabel(order.status),
            created_at: order.created_at,
            total: order.total,
          }
        : null,
      inspections,
      services,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};