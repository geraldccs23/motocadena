const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.listSales = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('pos_sales').select('*').order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.createSale = async (req, res, next) => {
  try {
    const { client_id, notes, payment_method } = req.body;
    const insert = { client_id: client_id || null, notes: notes || null, payment_method: payment_method || null };
    const { data, error } = await supabase.from('pos_sales').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.getSaleById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data: sale, error } = await supabase.from('pos_sales').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    const [{ data: items }, { data: payments }] = await Promise.all([
      supabase.from('pos_sale_items').select('*').eq('sale_id', id).order('created_at', { ascending: false }),
      supabase.from('pos_sale_payments').select('*').eq('sale_id', id).order('created_at', { ascending: false }),
    ]);
    res.json({ sale, items: items || [], payments: payments || [] });
  } catch (err) { next(err); }
};

exports.addSaleItem = async (req, res, next) => {
  try {
    const sale_id = req.params.id;
    const { product_id, service_id, work_order_id, description, quantity, unit_price } = req.body;
    if (!product_id && !service_id && !work_order_id) throw makeError(400, 'Debe proveer product_id, service_id o work_order_id');
    const insert = { sale_id, product_id: product_id || null, service_id: service_id || null, work_order_id: work_order_id || null, description: description || null, quantity: quantity ?? 1, unit_price: unit_price ?? 0 };
    const { data, error } = await supabase.from('pos_sale_items').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.updateSaleItem = async (req, res, next) => {
  try {
    const sale_id = req.params.id;
    const itemId = req.params.itemId;
    const { product_id, service_id, work_order_id, description, quantity, unit_price } = req.body;
    const update = {};
    if (product_id !== undefined) update.product_id = product_id;
    if (service_id !== undefined) update.service_id = service_id;
    if (work_order_id !== undefined) update.work_order_id = work_order_id;
    if (description !== undefined) update.description = description;
    if (quantity !== undefined) update.quantity = quantity;
    if (unit_price !== undefined) update.unit_price = unit_price;
    const { data, error } = await supabase.from('pos_sale_items').update(update).eq('id', itemId).eq('sale_id', sale_id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.removeSaleItem = async (req, res, next) => {
  try {
    const sale_id = req.params.id;
    const itemId = req.params.itemId;
    const { data, error } = await supabase.from('pos_sale_items').delete().eq('id', itemId).eq('sale_id', sale_id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};

exports.addPayment = async (req, res, next) => {
  try {
    const sale_id = req.params.id;
    const { method, amount, currency, original_amount, bank, reference } = req.body;
    if (!amount) throw makeError(400, 'amount es requerido');
    const insert = {
      sale_id,
      method: method || 'cash',
      amount,
      currency: currency || 'USD',
      original_amount: original_amount || amount,
      bank: bank || null,
      reference: reference || null
    };
    const { data, error } = await supabase.from('pos_sale_payments').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
  try {
    const id = req.params.id;

    // 1. Obtener la venta y sus items
    const { data: sale, error: sErr } = await supabase.from('pos_sales').select('*').eq('id', id).single();
    if (sErr) throw makeError(404, sErr.message, 'NOT_FOUND');
    if (sale.status === 'paid') throw makeError(400, 'La venta ya ha sido pagada');

    const { data: items, error: itErr } = await supabase.from('pos_sale_items').select('*').eq('sale_id', id);
    if (itErr) throw makeError(500, itErr.message);

    // 2. Actualizar estado
    const { error: uErr } = await supabase.from('pos_sales').update({ status: 'paid' }).eq('id', id);
    if (uErr) throw makeError(500, uErr.message);

    // 3. Generar movimientos de inventario por cada producto (tipo 'out')
    const movements = items
      .filter(it => it.product_id) // Solo ítems que son productos
      .map(it => ({
        product_id: it.product_id,
        movement_type: 'out',
        quantity: it.quantity,
        unit_cost: it.unit_price, // En ventas usamos el precio de venta como referencia de costo en movimiento si no hay otro
        source: 'sale',
        source_id: id
      }));

    if (movements.length > 0) {
      const { error: mErr } = await supabase.from('inventory_movements').insert(movements);
      if (mErr) throw makeError(500, mErr.message);
    }

    res.json({ ok: true, message: 'Venta pagada e inventario actualizado' });
  } catch (err) { next(err); }
};

exports.markVoid = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('pos_sales').update({ status: 'void' }).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.createReturn = async (req, res, next) => {
  try {
    const { sale_id, notes } = req.body;
    if (!sale_id) throw makeError(400, 'sale_id es requerido');
    const { data, error } = await supabase.from('pos_returns').insert([{ sale_id, notes: notes || null, status: 'completed' }]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.getReturnById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data: ret, error } = await supabase.from('pos_returns').select('*').eq('id', id).single();
    if (error) throw makeError(404, error.message, 'NOT_FOUND');
    const { data: items, error: e2 } = await supabase.from('pos_return_items').select('*').eq('return_id', id).order('created_at', { ascending: false });
    if (e2) throw makeError(500, e2.message);
    res.json({ return: ret, items });
  } catch (err) { next(err); }
};

exports.addReturnItem = async (req, res, next) => {
  try {
    const return_id = req.params.id;
    const { sale_item_id, product_id, service_id, quantity, unit_price } = req.body;
    const insert = { return_id, sale_item_id: sale_item_id || null, product_id: product_id || null, service_id: service_id || null, quantity: quantity ?? 1, unit_price: unit_price ?? 0 };
    const { data, error } = await supabase.from('pos_return_items').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};