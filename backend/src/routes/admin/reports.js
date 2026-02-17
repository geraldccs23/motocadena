const express = require('express');
const router = express.Router();
const { supabase } = require('../../services/supabaseClient');

// Resumen básico: conteos de tablas clave
router.get('/summary', async (req, res, next) => {
  try {
    const tables = ['clients', 'vehicles', 'work_orders', 'services', 'mechanics'];
    const results = {};
    for (const t of tables) {
      const { count, error } = await supabase
        .from(t)
        .select('id', { count: 'exact', head: true });
      if (error) return next(error);
      results[t] = count ?? 0;
    }
    res.json({ ok: true, summary: results });
  } catch (err) {
    next(err);
  }
});

// Salud del módulo de reportes
router.get('/health', (req, res) => {
  res.json({ ok: true, module: 'reports' });
});

module.exports = router;