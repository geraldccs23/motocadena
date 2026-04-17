import { supabase } from '../../services/supabaseClient.js';

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('services').insert([req.body]).select().single();
    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) { next(err); }
};