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
    let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (q) {
      query = query.or(`plate.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { client_id, plate, brand, model, year, vin, status } = req.body;
    if (!client_id) throw makeError(400, 'client_id es requerido');
    const insert = { client_id, plate: plate || null, brand: brand || null, model: model || null, year: year || null, vin: vin || null, status: status || 'active' };
    const { data, error } = await supabase.from('vehicles').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { plate, brand, model, year, vin, status } = req.body;
    const update = {};
    if (plate !== undefined) update.plate = plate;
    if (brand !== undefined) update.brand = brand;
    if (model !== undefined) update.model = model;
    if (year !== undefined) update.year = year;
    if (vin !== undefined) update.vin = vin;
    if (status !== undefined) update.status = status;
    const { data, error } = await supabase.from('vehicles').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('vehicles').delete().eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) {
    next(err);
  }
};