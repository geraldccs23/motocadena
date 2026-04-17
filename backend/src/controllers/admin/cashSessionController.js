import { supabase } from '../../services/supabaseClient.js';

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export const getCurrentSession = async (req, res, next) => {
  try {
    const { data: workshops } = await supabase.from('workshops').select('id').limit(1);
    const ws = workshops?.[0];
    if (!ws) throw makeError(400, 'Taller no configurado');

    const { data: session, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('workshop_id', ws.id)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (error) throw makeError(500, 'Error buscando sesión: ' + error.message);

    if (!session) {
      return res.json({ ok: true, is_open: false, session: null });
    }

    // Calcular estadísticas en tiempo real del turno
    // Sumamos pagos e ingresos desde la tabla 'payments'
    const { data: payments, error: pErr } = await supabase
      .from('payments')
      .select('amount, currency, method')
      .eq('cash_session_id', session.id);

    if (pErr) throw makeError(500, 'Error calculando balance: ' + pErr.message);

    let calcUsd = Number(session.opening_balance_usd);
    let calcBs = Number(session.opening_balance_bs);
    
    let breakdown = {
      EFECTIVO_USD: 0,
      EFECTIVO_BS: 0,
      PAGO_MOVIL: 0,
      TRANSFERENCIA_BS: 0,
      CREDITO: 0
    };

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.currency === 'USD') calcUsd += amt;
      else calcBs += amt;

      if (breakdown[p.method] !== undefined) breakdown[p.method] += amt;
      else breakdown[p.method] = amt;
    });

    res.json({
      ok: true,
      is_open: true,
      session: {
        ...session,
        live_calculated_usd: calcUsd,
        live_calculated_bs: calcBs,
        breakdown_live: breakdown
      }
    });
  } catch (err) { next(err); }
};

export const openSession = async (req, res, next) => {
  try {
    const { opening_balance_usd, opening_balance_bs, opened_by } = req.body;
    
    const { data: workshops } = await supabase.from('workshops').select('id').limit(1);
    const ws = workshops?.[0];
    if (!ws) throw makeError(400, 'Taller no encontrado');

    // Verificar si ya hay una abierta
    const { data: existing } = await supabase.from('cash_sessions')
      .select('id').eq('workshop_id', ws.id).eq('status', 'OPEN').maybeSingle();
    
    if (existing) throw makeError(400, 'Ya existe un turno abierto.');

    console.log("🚀 Opening session payload:", {
      workshop_id: ws.id,
      opened_by,
      opening_balance_usd,
      opening_balance_bs
    });

    const { data, error } = await supabase.from('cash_sessions').insert([{
      workshop_id: ws.id,
      opened_by: opened_by,
      opening_balance_usd: opening_balance_usd || 0,
      opening_balance_bs: opening_balance_bs || 0,
      status: 'OPEN'
    }]).select().single();

    if (error) {
      console.error("❌ Error Supabase (openSession):", error);
      throw makeError(500, 'Error abriendo caja: ' + error.message);
    }
    res.status(201).json({ ok: true, session: data });
  } catch (err) { 
    console.error("🔥 Catch openSession:", err);
    next(err); 
  }
};

export const closeSession = async (req, res, next) => {
  try {
    const { 
      session_id, 
      closed_by, 
      declared_usd, 
      declared_bs, 
      calculated_usd, 
      calculated_bs,
      closing_notes,
      breakdown 
    } = req.body;

    if (!session_id) throw makeError(400, 'session_id es requerido');

    // Validación de notas obligatorias ante discrepancia > 0.50
    const diff = Math.abs(Number(calculated_usd) - Number(declared_usd));
    if (diff > 0.50 && (!closing_notes || closing_notes.trim().length < 5)) {
      throw makeError(400, 'Discrepancia detectada. Debe justificar el arqueo en las notas de cierre.');
    }

    const { data, error } = await supabase.from('cash_sessions').update({
      closed_at: new Date().toISOString(),
      closed_by,
      declared_usd,
      declared_bs,
      calculated_usd,
      calculated_bs,
      closing_notes,
      breakdown,
      status: 'CLOSED'
    }).eq('id', session_id).select().single();

    if (error) throw makeError(500, 'Error cerrando caja: ' + error.message);
    res.json({ ok: true, session: data });
  } catch (err) { next(err); }
};
