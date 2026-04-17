import { supabase } from '../../services/supabaseClient.js';

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('work_orders')
      .select('*, customers(first_name, last_name), vehicles(plate, brand, model)')
      .order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { customer_id, vehicle_id, fault_description, advisor_id, mechanic_id } = req.body;
    
    // Obtener taller
    const { data: workshops } = await supabase.from('workshops').select('id').limit(1);
    const wsId = workshops?.[0]?.id;

    const { data, error } = await supabase.from('work_orders').insert([{
      workshop_id: wsId,
      customer_id,
      vehicle_id,
      fault_description,
      advisor_id,
      mechanic_id,
      status: 'DRAFT'
    }]).select().single();

    if (error) throw makeError(500, 'Error creando orden: ' + error.message);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data: order, error } = await supabase.from('work_orders')
      .select('*, customers(*), vehicles(*)')
      .eq('id', id).single();
    
    if (error) throw makeError(404, 'Orden no encontrada');

    const [{ data: services }, { data: parts }] = await Promise.all([
      supabase.from('work_order_services').select('*').eq('work_order_id', id),
      supabase.from('work_order_parts').select('*').eq('work_order_id', id)
    ]);

    res.json({ ...order, services: services || [], parts: parts || [] });
  } catch (err) { next(err); }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase.from('work_orders').update({ status }).eq('id', req.params.id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
     const { data, error } = await supabase.from('work_orders').update(req.body).eq('id', req.params.id).select().single();
     if (error) throw makeError(500, error.message);
     res.json(data);
  } catch (err) { next(err); }
};