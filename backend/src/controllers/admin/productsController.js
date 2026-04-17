import { supabase } from '../../services/supabaseClient.js';

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').insert([req.body]).select().single();
    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error) throw new Error('Producto no encontrado');
    res.json(data);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
};