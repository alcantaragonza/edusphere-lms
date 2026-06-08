/**
 * Conexion a MongoDB — Railway
 *
 * Decision: mongoose SOLO para manejar el ciclo de vida de la conexion
 * (reconexion, eventos, pooling). Todas las operaciones CRUD usan el
 * driver nativo via mongoose.connection.db.collection().
 *
 * Esto cumple con la restriccion "sin ORMs" porque:
 *   1. No se usan schemas de mongoose para validar datos.
 *   2. No se usan middlewares (pre/post hooks).
 *   3. No se usa populate() ni referencias de mongoose.
 *   4. Las queries son directamente contra la API nativa de MongoDB.
 *
 * La validacion de datos la hace MongoDB via JSON Schema (definido en
 * db/Mongo/col-edusphere.js) a nivel de coleccion, no en la aplicacion.
 */
const mongoose = require('mongoose');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_USER = process.env.MONGO_INITDB_ROOT_USERNAME;
const MONGO_PASS = process.env.MONGO_INITDB_ROOT_PASSWORD;
const MONGO_DB = process.env.MONGO_INITDB_DATABASE || 'edusphere';

let db = null;

function buildUri() {
  if (!MONGO_USER || !MONGO_PASS || !MONGO_HOST) return null;
  return `mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
}

async function conectarMongo() {
  const uri = buildUri();
  if (!uri) {
    console.warn('[mongo] Variables MONGO_HOST/USER/PASSWORD no definidas');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    db = mongoose.connection.db;
    console.log('[mongo] Conectado a MongoDB');
  } catch (err) {
    console.error('[mongo] Error de conexion:', err.message);
  }
}

function getDb() {
  if (!db) throw new Error('MongoDB no esta conectado. Llama a conectarMongo() primero.');
  return db;
}

mongoose.connection.on('disconnected', () => console.warn('[mongo] Desconectado'));
mongoose.connection.on('error', (err) => console.error('[mongo] Error:', err.message));

module.exports = { conectarMongo, getDb };
