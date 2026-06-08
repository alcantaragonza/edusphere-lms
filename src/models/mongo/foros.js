const { getDb } = require('../../config/mongo');

const COLECCION = 'foros';

function collection() {
  return getDb().collection(COLECCION);
}

async function findByCurso(cursoId) {
  return collection().find({ curso_id: cursoId, parent_id: null })
    .sort({ fecha_creacion: -1 })
    .toArray();
}

async function findRespuestas(raizId) {
  return collection().find({ ancestro_raiz_id: raizId })
    .sort({ profundidad: 1, fecha_creacion: 1 })
    .toArray();
}

async function findOne(id) {
  return collection().findOne({ _id: id });
}

async function create(data) {
  const result = await collection().insertOne(data);
  return { ...data, _id: result.insertedId };
}

module.exports = { findByCurso, findRespuestas, findOne, create };
