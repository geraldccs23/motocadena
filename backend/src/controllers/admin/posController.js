import { supabase } from '../../services/supabaseClient.js';

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('pos_sales')
      .select('*, customers(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const { data: sale, error } = await supabase.from('pos_sales').select('*, pos_sale_items(*)').eq('id', req.params.id).single();
    if (error) throw makeError(404, 'Venta no encontrada');
    res.json(sale);
  } catch (err) { next(err); }
};

export const checkout = async (req, res, next) => {
  try {
    const { customer_id, items, payments, total_amount, seller_id } = req.body;

    if (!items || items.length === 0) throw makeError(400, 'La venta debe tener items');
    
    // Si hay un método 'CREDITO', marcamos la venta como crédito
    const hasCredit = payments.some(p => p.method === 'CREDITO');
    const isCredit = hasCredit || req.body.is_credit;

    // 1. Obtener sesión de caja abierta
    const { data: workshops } = await supabase.from('workshops').select('id').limit(1);
    const wsId = workshops?.[0]?.id;
    
    const { data: session, error: sErr } = await supabase.from('cash_sessions')
      .select('id').eq('workshop_id', wsId).eq('status', 'OPEN').maybeSingle();
      
    if (sErr || !session) throw makeError(400, 'DEBE tener un turno de caja abierto para procesar ventas.');

    // 2. Crear la Venta (Cabecera)
    const { data: sale, error: saleErr } = await supabase.from('pos_sales').insert([{
      workshop_id: wsId,
      customer_id,
      seller_id,
      total_amount,
      is_credit: isCredit
    }]).select().single();

    if (saleErr) throw makeError(500, 'Error creando venta: ' + saleErr.message);

    // 3. Crear Items
    const saleItems = items.map(it => ({
      sale_id: sale.id,
      product_id: it.type === 'PRODUCT' ? it.id : null,
      service_id: it.type === 'SERVICE' ? it.id : null,
      quantity: it.quantity,
      price: it.price
    }));

    const { error: itemsErr } = await supabase.from('pos_sale_items').insert(saleItems);
    if (itemsErr) throw makeError(500, 'Error insertando items: ' + itemsErr.message);

    // 4. Registrar Pagos (Solo los que no sean 'CREDITO')
    const realPayments = payments.filter(p => p.method !== 'CREDITO');
    if (realPayments.length > 0) {
      const salePayments = realPayments.map(p => ({
        workshop_id: wsId,
        cash_session_id: session.id,
        sale_id: sale.id,
        amount: p.amountUSD || p.amount,
        currency: p.currency || 'USD',
        method: p.method,
        reference_code: p.reference || p.reference_code || null
      }));

      const { error: payErr } = await supabase.from('payments').insert(salePayments);
      if (payErr) throw makeError(500, 'Error registrando abonos: ' + payErr.message);
    }

    // 5. Ajuste de Inventario
    for (const item of items) {
      if (item.type === 'PRODUCT') {
        await supabase.rpc('process_inventory_movement', {
          p_product_id: item.id,
          p_warehouse_id: null,
          p_movement_type: 'out',
          p_quantity: item.quantity,
          p_notes: `Venta POS #${sale.id.slice(0,8)}`
        });
      }
    }

    res.status(201).json({ ok: true, sale_id: sale.id });
  } catch (err) { next(err); }
};