'use strict';

// Entry point (coincide con "main" en package.json).
// Carga variables de entorno y levanta el servidor HTTP.
require('dotenv').config();

const app = require('./src/app');
const { pool } = require('./src/config/db');

// Aviso temprano si falta configuración crítica de auth.
if (!process.env.JWT_SECRET) {
  console.warn('[EduSphere] ⚠️  JWT_SECRET no está definido en .env: /api/auth/* fallará. Agrégalo y reinicia.');
}

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`[EduSphere] API escuchando en http://localhost:${PORT}/api`);
});

// Apagado ordenado: cierra el server y el pool de pg.
function apagar(signal) {
  console.log(`\n[EduSphere] ${signal} recibido, cerrando...`);
  server.close(() => {
    pool.end().then(() => {
      console.log('[EduSphere] recursos liberados. Adiós.');
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
