import { supabase } from '../../services/supabaseClient.js';

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('appointments').select('*, customers(first_name, last_name), vehicles(plate)').order('scheduled_at', { ascending: true });
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('appointments').insert([req.body]).select().single();
    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('appointments').select('*, customers(*), vehicles(*)').eq('id', req.params.id).single();
    if (error) throw new Error('Cita no encontrada');
    res.json(data);
  } catch (err) { next(err); }
};