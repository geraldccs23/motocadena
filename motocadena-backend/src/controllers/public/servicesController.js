const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, base_price, duration_minutes')
      .order('base_price', { ascending: true });
    if (error) throw makeError(500, error.message);
    res.json({ services: data || [] });
  } catch (err) { next(err); }
};