const { supabase } = require('../../services/supabaseClient');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('mechanics').select('*').order('created_at', { ascending: false });
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { full_name, phone, email, status } = req.body;
    if (!full_name) throw makeError(400, 'full_name es requerido');
    const { data, error } = await supabase.from('mechanics').insert([{ full_name, phone: phone || null, email: email || null, status: status || 'active' }]).select();
    if (error) throw makeError(500, error.message);
    res.status(201).json(data?.[0] || null);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { full_name, phone, email, status } = req.body;
    const update = {};
    if (full_name !== undefined) update.full_name = full_name;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (status !== undefined) update.status = status;
    const { data, error } = await supabase.from('mechanics').update(update).eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json(data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('mechanics').delete().eq('id', id).select().single();
    if (error) throw makeError(500, error.message);
    res.json({ ok: true, deleted: data });
  } catch (err) { next(err); }
};