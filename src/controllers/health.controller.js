'use strict';

// Healthcheck: verifica conectividad real contra PostgreSQL y MongoDB.
const { query } = require('../config/db');
const { mongoose } = require('../config/mongo');
const { asyncWrap } = require('./crud.controller');

// Hace un ping real a Mongo para generar tráfico y confirmar la conexión.
// No lanza: si Mongo está caído devuelve 'down' con el motivo, sin tumbar el
// healthcheck (Postgres es la base principal).
async function estadoMongo() {
  // readyState 1 = conectado. Si no, ni intentamos el ping (evita colgar).
  if (mongoose.connection.readyState !== 1) {
    return { mongo: 'down', detalle: 'sin conexión (readyState != 1)' };
  }
  try {
    await mongoose.connection.db.admin().ping();
    return { mongo: 'up' };
  } catch (err) {
    return { mongo: 'down', detalle: err.message };
  }
}

// GET /api/health
const health = asyncWrap(async (req, res) => {
  await query('SELECT 1');
  const mongo = await estadoMongo();
  res.json({ ok: true, db: 'up', ...mongo });
});

module.exports = { health };
