import { supabase } from '../../services/supabaseClient.js';

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export const loginAndFetch = async (req, res, next) => {
  try {
    const { phone, plate } = req.body;
    if (!phone || !plate) throw makeError(400, 'Teléfono y Placa son requeridos para el acceso.');

    // 1. Encontrar Vehículo por Placa
    const { data: vehiclesData, error: vErr } = await supabase
      .from('vehicles')
      .select('*, customer:customers(*)')
      .eq('plate', plate.trim().toUpperCase())
      .limit(1);

    if (vErr) throw makeError(500, vErr.message);
    if (!vehiclesData || vehiclesData.length === 0) {
      throw makeError(404, 'No hemos encontrado un vehículo con esa placa en MOTOCADENA.');
    }

    const vehicle = vehiclesData[0];
    const customer = vehicle.customer;

    if (!customer) throw makeError(404, 'Dueño no encontrado para este vehículo.');

    // 2. Validar Teléfono del Dueño
    // Normalizamos quitando espacios/guiones para comparar
    const cleanPhone = (p) => p.replace(/\D/g, '');
    if (cleanPhone(customer.phone) !== cleanPhone(phone)) {
      throw makeError(401, 'El número de teléfono no coincide con el dueño registrado de esta máquina.');
    }

    // 3. Traer resto de vehículos del mismo dueño
    const { data: allVehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customer.id);

    // 4. Traer Ordenes de trabajo vinculadas al cliente
    const { data: workOrders } = await supabase.from('work_orders')
      .select('*, vehicle:vehicles(*)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    // 5. Traer Historial de Citas (Appointments)
    const { data: appointments } = await supabase.from('appointments')
      .select('*, vehicle:vehicles(*), service:services(*)')
      .eq('customer_id', customer.id)
      .order('scheduled_at', { ascending: false });

    // 6. Enviar Snapshot Seguro
    res.json({
      ok: true,
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        email: customer.email
      },
      vehicles: allVehicles || [],
      workOrders: workOrders || [],
      appointments: appointments || []
    });

  } catch (err) { next(err); }
};
