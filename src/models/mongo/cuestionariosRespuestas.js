const { getDb } = require('../../config/mongo');

const COLECCION = 'cuestionarios_respuestas';

function collection() {
  return getDb().collection(COLECCION);
}

async function findByEstudiante(estudianteId) {
  return collection().find({ estudiante_id: estudianteId })
    .sort({ fecha_intento: -1 })
    .toArray();
}

async function findByLeccion(leccionId) {
  return collection().find({ leccion_id: leccionId })
    .sort({ fecha_intento: -1 })
    .toArray();
}

async function findByEstudianteYLeccion(estudianteId, leccionId) {
  return collection().find({ estudiante_id: estudianteId, leccion_id: leccionId })
    .sort({ intento_numero: -1 })
    .toArray();
}

async function create(data) {
  const result = await collection().insertOne(data);
  return { ...data, _id: result.insertedId };
}

module.exports = { findByEstudiante, findByLeccion, findByEstudianteYLeccion, create };
