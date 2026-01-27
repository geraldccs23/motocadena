function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Error interno';
  if (process.env.NODE_ENV !== 'production') {
    console.error('[error]', err);
  }
  res.status(status).json({ error: { code, message } });
}

module.exports = { errorHandler };