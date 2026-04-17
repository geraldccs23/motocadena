import { supabase } from '../../services/supabaseClient.js';

export const movements = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('inventory_movements').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const stock = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('inventory_levels').select('*, products(*)').order('stock', { ascending: false });
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const adjust = async (req, res, next) => {
  try {
    const { product_id, warehouse_id, movement_type, quantity, notes } = req.body;
    const { data, error } = await supabase.rpc('process_inventory_movement', {
      p_product_id: product_id,
      p_warehouse_id: warehouse_id || null,
      p_movement_type: movement_type,
      p_quantity: quantity,
      p_notes: notes || 'Ajuste manual'
    });
    if (error) throw new Error(error.message);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};