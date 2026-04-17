import { supabase } from '../../services/supabaseClient.js';

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, cash_sessions(opened_at)')
      .order('created_at', { ascending: false });

    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { category, description, amount_usd, amount_bs, cash_session_id, created_by } = req.body;

    // 1. Validar que haya sesión abierta
    let sessionId = cash_session_id;
    if (!sessionId) {
      const { data: workshops } = await supabase.from('workshops').select('id').limit(1);
      const wsId = workshops?.[0]?.id;
      const { data: session } = await supabase.from('cash_sessions')
        .select('id').eq('workshop_id', wsId).eq('status', 'OPEN').maybeSingle();
      
      if (!session) throw makeError(400, 'Debe haber una caja abierta para registrar un egreso.');
      sessionId = session.id;
    }

    const { data, error } = await supabase.from('expenses').insert([{
      workshop_id: req.body.workshop_id || (await supabase.from('workshops').select('id').limit(1).single()).data?.id,
      cash_session_id: sessionId,
      category,
      description,
      amount_usd: amount_usd || 0,
      amount_bs: amount_bs || 0,
      created_by
    }]).select().single();

    if (error) throw makeError(500, 'Error registrando egreso: ' + error.message);
    
    // OPCIONAL: Registrar un pago negativo o un movimiento en la caja si el sistema lo requiere
    // Por ahora solo en la tabla expenses.

    res.status(201).json({ ok: true, expense: data });
  } catch (err) { next(err); }
};
