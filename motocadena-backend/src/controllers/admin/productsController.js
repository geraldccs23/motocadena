const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { sku, name, description, unit_price, unit_cost, status } = req.body;
    if (!name) throw makeError(400, 'name es requerido');
    const { data, error } = await supabase.from('products').insert([{ sku: sku || null, name, description: description || null, unit_price: unit_price ?? 0, unit_cost: unit_cost ?? 0, status: status || 'active' }]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    res.json(data);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { sku, name, description, unit_price, unit_cost, status } = req.body;
    const update = {};
    if (sku !== undefined) update.sku = sku;
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (unit_price !== undefined) update.unit_price = unit_price;
    if (unit_cost !== undefined) update.unit_cost = unit_cost;
    if (status !== undefined) update.status = status;
    const { data, error } = await supabase.from('products').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('products').delete().eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};