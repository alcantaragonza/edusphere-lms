'use strict';

// Conexión a MongoDB con mongoose, reutilizable en toda la app.
// Lee las variables que YA existen en tu .env (compartidas con docker-compose):
//   MONGO_HOST, MONGO_PORT, MONGO_INITDB_ROOT_USERNAME,
//   MONGO_INITDB_ROOT_PASSWORD, MONGO_INITDB_DATABASE
// Mongo queda expuesto en el host por MONGO_PORT (mapeado al 27017 del contenedor).
//
// Se puede sobreescribir todo con MONGO_URI si prefieres una cadena completa.
const mongoose = require('mongoose');

// Construye la cadena de conexión a partir de las variables sueltas, o usa
// MONGO_URI si está definida. authSource=admin porque el usuario root del
// contenedor se crea en la base `admin`.
function construirUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const usuario = process.env.MONGO_INITDB_ROOT_USERNAME;
  const password = process.env.MONGO_INITDB_ROOT_PASSWORD;
  const base = process.env.MONGO_INITDB_DATABASE || 'edusphere';

  const credenciales =
    usuario && password
      ? `${encodeURIComponent(usuario)}:${encodeURIComponent(password)}@`
      : '';
  const authSource = credenciales ? '?authSource=admin' : '';
  return `mongodb://${credenciales}${host}:${port}/${base}${authSource}`;
}

// Conecta a Mongo. No es fatal si falla: la API sigue arriba para las rutas de
// PostgreSQL; solo las rutas Mongo responderán error hasta que haya conexión.
async function conectarMongo() {
  const uri = construirUri();
  // Falla rápido (en vez de colgar la petición) si el servidor no responde.
  mongoose.set('bufferTimeoutMS', 5000);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[EduSphere] MongoDB conectado');
  } catch (err) {
    console.warn(
      `[EduSphere] ⚠️  No se pudo conectar a MongoDB: ${err.message}. ` +
        'Las rutas Mongo (/api/progreso-lecciones, /api/foros, ...) fallarán hasta que esté disponible.'
    );
  }
}

// Cierre ordenado para el apagado del proceso.
async function desconectarMongo() {
  await mongoose.disconnect();
}

module.exports = { mongoose, conectarMongo, desconectarMongo };
