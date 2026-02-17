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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 1. Fetch from the view with range for pagination
    const { data, error, count } = await supabase
      .from('v_products_with_stock')
      .select('*', { count: 'exact' })
      .order('name')
      .range(offset, offset + limit - 1);

    if (error) throw makeError(500, error.message);

    // 2. Map to the format expected by the frontend
    const result = data.map(p => ({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      unit_price: p.unit_price,
      unit_cost: p.unit_cost,
      status: p.status,
      stock: Number(p.stock) || 0
    }));

    res.json({
      stock: result,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    });
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