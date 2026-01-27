const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.movements = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('inventory_movements').select('*').order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.stock = async (req, res, next) => {
  try {
    // 1. Obtener todos los productos
    const { data: products, error: pErr } = await supabase.from('products').select('*').order('name');
    if (pErr) throw makeError(500, pErr.message);

    // 2. Obtener todos los movimientos
    const { data: movements, error: mErr } = await supabase.from('inventory_movements').select('product_id, movement_type, quantity');
    if (mErr) throw makeError(500, mErr.message);

    // 3. Calcular balances
    const stockMap = {};
    for (const m of movements || []) {
      if (!stockMap[m.product_id]) stockMap[m.product_id] = 0;
      if (m.movement_type === 'in') stockMap[m.product_id] += Number(m.quantity);
      else if (m.movement_type === 'out') stockMap[m.product_id] -= Number(m.quantity);
    }

    // 4. Combinar
    const result = products.map(p => ({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      unit_price: p.unit_price,
      unit_cost: p.unit_cost,
      status: p.status,
      stock: stockMap[p.id] || 0
    }));

    res.json({ stock: result });
  } catch (err) { next(err); }
};

exports.stockByProduct = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity')
      .eq('product_id', productId);
    if (error) throw makeError(500, error.message);
    let stock = 0;
    for (const m of data || []) {
      if (m.movement_type === 'in') stock += Number(m.quantity);
      else if (m.movement_type === 'out') stock -= Number(m.quantity);
    }
    res.json({ product_id: productId, stock });
  } catch (err) { next(err); }
};

exports.adjust = async (req, res, next) => {
  try {
    const { product_id, movement_type, quantity, unit_cost, source, source_id } = req.body;
    if (!product_id || !movement_type || !quantity) throw makeError(400, 'product_id, movement_type, quantity son requeridos');
    const insert = { product_id, movement_type, quantity, unit_cost: unit_cost ?? 0, source: source || 'adjustment', source_id: source_id || null };
    const { data, error } = await supabase.from('inventory_movements').insert([insert]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};