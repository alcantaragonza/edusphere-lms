const { getDb } = require('../../config/mongo');

const COLECCION = 'logs_actividad';

function collection() {
  return getDb().collection(COLECCION);
}

async function findByUsuario(usuarioId, limit = 50) {
  return collection().find({ usuario_id: usuarioId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

async function findByCurso(cursoId, limit = 50) {
  return collection().find({ 'metadata.curso_id': cursoId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

async function findByEvento(tipoEvento, desde, hasta) {
  const query = { tipo_evento: tipoEvento };
  if (desde || hasta) {
    query.timestamp = {};
    if (desde) query.timestamp.$gte = new Date(desde);
    if (hasta) query.timestamp.$lte = new Date(hasta);
  }
  return collection().find(query).sort({ timestamp: -1 }).toArray();
}

async function create(data) {
  const result = await collection().insertOne(data);
  return { ...data, _id: result.insertedId };
}

async function crearVarios(logs) {
  if (!logs.length) return [];
  const result = await collection().insertMany(logs);
  return result.insertedCount;
}

module.exports = { findByUsuario, findByCurso, findByEvento, create, crearVarios };
