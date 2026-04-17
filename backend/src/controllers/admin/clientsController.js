import { supabase } from '../../services/supabaseClient.js';

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export const list = async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { first_name, last_name, id_number, email, phone, address, is_vip } = req.body;
    if (!first_name || !last_name || !phone) {
      throw makeError(400, 'Nombre, Apellido y Teléfono son obligatorios');
    }
    const { data, error } = await supabase
      .from('customers')
      .insert([{ first_name, last_name, id_number, email, phone, address, is_vip: is_vip || false }])
      .select().single();

    if (error) throw makeError(500, 'Error creando cliente: ' + error.message);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', req.params.id).single();
    if (error) throw makeError(404, 'Cliente no encontrado');
    res.json(data);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('customers')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('customers').delete().eq('id', req.params.id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};