'use strict';

// Capa de configuración: un único Pool de pg reutilizable en toda la app.
// Lee las variables que YA existen en tu .env (compartidas con docker-compose):
//   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
// Postgres queda expuesto en el host por POSTGRES_PORT (5433 -> 5432 del contenedor).
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  max: Number(process.env.PGPOOL_MAX) || 10,
});

// Evita que un error del pool (ej. caída de la BD) tumbe el proceso sin aviso.
pool.on('error', (err) => {
  console.error('[pg] error inesperado en cliente inactivo del pool:', err.message);
});

// Helper central: TODA consulta pasa por aquí y va parametrizada ($1, $2, ...).
// Nunca se concatenan strings en el SQL.
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
