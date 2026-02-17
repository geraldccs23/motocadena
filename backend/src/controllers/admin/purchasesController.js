const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('purchase_invoices').select('*').order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { supplier_id, notes } = req.body;
    const insert = { supplier_id: supplier_id || null, notes: notes || null };
    const { data, error } = await supabase.from('purchase_invoices').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data: invoice, error } = await supabase.from('purchase_invoices').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    const { data: items, error: e2 } = await supabase.from('purchase_items').select('*').eq('purchase_id', id).order('created_at', { ascending: false });
    if (e2) throw makeError(500, e2.message);
    res.json({ invoice, items });
  } catch (err) { next(err); }
};

exports.addItem = async (req, res, next) => {
  try {
    const purchase_id = req.params.id;
    const { product_id, quantity, unit_cost } = req.body;
    if (!product_id) throw makeError(400, 'product_id es requerido');
    const insert = { purchase_id, product_id, quantity: quantity ?? 1, unit_cost: unit_cost ?? 0 };
    const { data, error } = await supabase.from('purchase_items').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.updateItem = async (req, res, next) => {
  try {
    const purchase_id = req.params.id;
    const itemId = req.params.itemId;
    const { product_id, quantity, unit_cost } = req.body;
    const update = {};
    if (product_id !== undefined) update.product_id = product_id;
    if (quantity !== undefined) update.quantity = quantity;
    if (unit_cost !== undefined) update.unit_cost = unit_cost;
    const { data, error } = await supabase.from('purchase_items').update(update).eq('id', itemId).eq('purchase_id', purchase_id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.removeItem = async (req, res, next) => {
  try {
    const purchase_id = req.params.id;
    const itemId = req.params.itemId;
    const { data, error } = await supabase.from('purchase_items').delete().eq('id', itemId).eq('purchase_id', purchase_id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};

exports.receive = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { document_type, invoice_number, control_number, document_date } = req.body;

    // 1. Obtener la orden y sus items
    const { data: invoice, error: iErr } = await supabase.from('purchase_invoices').select('*').eq('id', id).single();
    if (iErr) throw makeError(404, iErr.message, 'NOT_FOUND');
    if (invoice.status === 'received') throw makeError(400, 'La compra ya ha sido recibida');

    const { data: items, error: itErr } = await supabase.from('purchase_items').select('*').eq('purchase_id', id);
    if (itErr) throw makeError(500, itErr.message);
    if (!items || items.length === 0) throw makeError(400, 'La compra no tiene items');

    // 2. Actualizar estado de la factura
    const { error: uErr } = await supabase.from('purchase_invoices').update({
      status: 'received',
      document_type: document_type || null,
      invoice_number: invoice_number || null,
      control_number: control_number || null,
      document_date: document_date || null
    }).eq('id', id);
    if (uErr) throw makeError(500, uErr.message);

    // 3. Generar movimientos de inventario por cada item
    const movements = items.map(it => ({
      product_id: it.product_id,
      movement_type: 'in',
      quantity: it.quantity,
      unit_cost: it.unit_cost,
      source: 'purchase',
      source_id: id
    }));

    const { error: mErr } = await supabase.from('inventory_movements').insert(movements);
    if (mErr) throw makeError(500, mErr.message);

    res.json({ ok: true, message: 'Compra recibida e inventario actualizado' });
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('purchase_invoices').update({ status: 'cancelled' }).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};