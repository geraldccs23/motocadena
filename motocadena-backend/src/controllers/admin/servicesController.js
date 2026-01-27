const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    res.json(data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, base_price, duration_minutes } = req.body;
    if (!name) throw makeError(400, 'name es requerido');
    const { data, error } = await supabase.from('services').insert([{ name, description: description || null, base_price: base_price ?? 0, duration_minutes: duration_minutes ?? 0 }]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, description, base_price, duration_minutes } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (base_price !== undefined) update.base_price = base_price;
    if (duration_minutes !== undefined) update.duration_minutes = duration_minutes;
    const { data, error } = await supabase.from('services').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('services').delete().eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};