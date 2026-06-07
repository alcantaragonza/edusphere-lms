'use strict';

// Healthcheck: verifica conectividad real contra PostgreSQL.
const { query } = require('../config/db');
const { asyncWrap } = require('./crud.controller');

// GET /api/health
const health = asyncWrap(async (req, res) => {
  await query('SELECT 1');
  res.json({ ok: true, db: 'up' });
});

module.exports = { health };
