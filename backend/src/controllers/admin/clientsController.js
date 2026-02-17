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
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
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
    const { full_name, phone, vehicle_plate, vehicle_brand, vehicle_model } = req.body;
    if (!full_name) throw makeError(400, 'full_name es requerido');
    const { data, error } = await supabase
      .from('clients')
      .insert([{ full_name, phone: phone || null, vehicle_plate: vehicle_plate || null, vehicle_brand: vehicle_brand || null, vehicle_model: vehicle_model || null }])
      .select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { full_name, phone, vehicle_plate, vehicle_brand, vehicle_model } = req.body;
    const update = {};
    if (full_name !== undefined) update.full_name = full_name;
    if (phone !== undefined) update.phone = phone;
    if (vehicle_plate !== undefined) update.vehicle_plate = vehicle_plate;
    if (vehicle_brand !== undefined) update.vehicle_brand = vehicle_brand;
    if (vehicle_model !== undefined) update.vehicle_model = vehicle_model;
    const { data, error } = await supabase.from('clients').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('clients').delete().eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) {
    next(err);
  }
};

exports.listVehiclesByClient = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('vehicles').select('*').eq('client_id', id).order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
};