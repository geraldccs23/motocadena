// Middleware de autenticación placeholder
// En el futuro, validar JWT de Supabase o de gateway propio.
function authPlaceholder(req, res, next) {
  // No bloquea. Puede leer cabeceras x-user-id, x-role si se desea.
  req.auth = { method: 'service_key' };
  next();
}

module.exports = { authPlaceholder };