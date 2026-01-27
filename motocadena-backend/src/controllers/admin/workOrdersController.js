const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (req, res, next) => {
  try {
    const status = req.query.status;
    let query = supabase.from('work_orders').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { client_id, service_id, assigned_mechanic_id, notes } = req.body;
    if (!client_id) throw makeError(400, 'client_id es requerido');
    const insert = { client_id, service_id: service_id || null, assigned_mechanic_id: assigned_mechanic_id || null, status: 'pending', notes: notes || null };
    const { data, error } = await supabase.from('work_orders').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data: order, error } = await supabase.from('work_orders').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    // Asociados
    const [{ data: items }, { data: initial }, { data: final }, { data: mechanic }] = await Promise.all([
      supabase.from('work_order_services').select('*').eq('work_order_id', id).order('created_at', { ascending: false }),
      supabase.from('initial_inspections').select('*').eq('work_order_id', id).limit(1),
      supabase.from('final_inspections').select('*').eq('work_order_id', id).limit(1),
      order.assigned_mechanic_id ? supabase.from('mechanics').select('*').eq('id', order.assigned_mechanic_id).limit(1) : Promise.resolve({ data: [] }),
    ]);
    res.json({ order, services: items || [], initial_inspection: initial?.[0] || null, final_inspection: final?.[0] || null, mechanic: mechanic?.[0] || null });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { client_id, service_id, assigned_mechanic_id, status, notes } = req.body;
    const update = {};
    if (client_id !== undefined) update.client_id = client_id;
    if (service_id !== undefined) update.service_id = service_id;
    if (assigned_mechanic_id !== undefined) update.assigned_mechanic_id = assigned_mechanic_id;
    if (status !== undefined) update.status = status; // validar enum en BD
    if (notes !== undefined) update.notes = notes;
    const { data, error } = await supabase.from('work_orders').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const allowed = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) throw makeError(400, 'Estado inválido');
    const { data, error } = await supabase.from('work_orders').update({ status }).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.addServiceItem = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const { service_id, quantity, unit_price, notes } = req.body;
    if (!service_id) throw makeError(400, 'service_id es requerido');
    const insert = { work_order_id, service_id, quantity: quantity ?? 1, unit_price: unit_price ?? 0, notes: notes || null };
    const { data, error } = await supabase.from('work_order_services').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.updateServiceItem = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const itemId = req.params.itemId;
    const { service_id, quantity, unit_price, notes } = req.body;
    const update = {};
    if (service_id !== undefined) update.service_id = service_id;
    if (quantity !== undefined) update.quantity = quantity;
    if (unit_price !== undefined) update.unit_price = unit_price;
    if (notes !== undefined) update.notes = notes;
    const { data, error } = await supabase.from('work_order_services').update(update).eq('id', itemId).eq('work_order_id', work_order_id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.removeServiceItem = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const itemId = req.params.itemId;
    const { data, error } = await supabase.from('work_order_services').delete().eq('id', itemId).eq('work_order_id', work_order_id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};

exports.upsertInitialInspection = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const payload = { ...req.body, work_order_id };
    // Buscar si existe
    const { data: existing, error: e1 } = await supabase.from('initial_inspections').select('id').eq('work_order_id', work_order_id).limit(1);
    if (e1) throw makeError(500, e1.message);
    let result;
    if (existing && existing.length > 0) {
      const { data, error } = await supabase.from('initial_inspections').update(payload).eq('id', existing[0].id).select().single();
      if (error) throw makeError(500, error.message);
      result = data;
    } else {
      const { data, error } = await supabase.from('initial_inspections').insert([payload]).select();
      if (error) throw makeError(500, error.message);
      result = data?.[0] || null;
    }
    res.status(201).json(result);
  } catch (err) { next(err); }
};

exports.getInitialInspection = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const { data, error } = await supabase.from('initial_inspections').select('*').eq('work_order_id', work_order_id).limit(1);
    if (error) throw makeError(500, error.message);
    res.json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.upsertFinalInspection = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const payload = { ...req.body, work_order_id };
    const { data: existing, error: e1 } = await supabase.from('final_inspections').select('id').eq('work_order_id', work_order_id).limit(1);
    if (e1) throw makeError(500, e1.message);
    let result;
    if (existing && existing.length > 0) {
      const { data, error } = await supabase.from('final_inspections').update(payload).eq('id', existing[0].id).select().single();
      if (error) throw makeError(500, error.message);
      result = data;
    } else {
      const { data, error } = await supabase.from('final_inspections').insert([payload]).select();
      if (error) throw makeError(500, error.message);
      result = data?.[0] || null;
    }
    res.status(201).json(result);
  } catch (err) { next(err); }
};

exports.getFinalInspection = async (req, res, next) => {
  try {
    const work_order_id = req.params.id;
    const { data, error } = await supabase.from('final_inspections').select('*').eq('work_order_id', work_order_id).limit(1);
    if (error) throw makeError(500, error.message);
    res.json(data?.[0] || null);
  } catch (err) { next(err); }
};