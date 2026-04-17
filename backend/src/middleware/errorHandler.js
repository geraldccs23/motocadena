// src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error('[errorHandler]', err);
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servidor'
    }
  });
};

// ---
// src/middleware/authPlaceholder.js
export const authPlaceholder = (req, res, next) => {
  // Placeholder para futura implementación de JWT
  // Por ahora inyectamos un rol administrativo simulado si no hay header
  req.user = { id: 'admin-id', role: 'DIRECTOR' };
  next();
};