const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('appointments').select('*').order('scheduled_at', { ascending: true });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { client_id, service_id, assigned_mechanic_id, scheduled_at, duration_minutes, notes } = req.body;
    if (!client_id || !scheduled_at) throw makeError(400, 'client_id y scheduled_at son requeridos');
    const insert = { client_id, service_id: service_id || null, assigned_mechanic_id: assigned_mechanic_id || null, scheduled_at, duration_minutes: duration_minutes ?? 60, status: 'scheduled', notes: notes || null };
    const { data, error } = await supabase.from('appointments').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('appointments').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    res.json(data);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { service_id, assigned_mechanic_id, scheduled_at, duration_minutes, status, notes } = req.body;
    const update = {};
    if (service_id !== undefined) update.service_id = service_id;
    if (assigned_mechanic_id !== undefined) update.assigned_mechanic_id = assigned_mechanic_id;
    if (scheduled_at !== undefined) update.scheduled_at = scheduled_at;
    if (duration_minutes !== undefined) update.duration_minutes = duration_minutes;
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;
    const { data, error } = await supabase.from('appointments').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.confirm = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.getGeneratedWorkOrder = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('work_orders').select('*').eq('appointment_id', id).limit(1);
    if (error) throw makeError(500, error.message);
    res.json(data?.[0] || null);
  } catch (err) { next(err); }
};