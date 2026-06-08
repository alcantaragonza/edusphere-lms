const { getDb } = require('../../config/mongo');

const COLECCION = 'resenas';

function collection() {
  return getDb().collection(COLECCION);
}

async function findByCurso(cursoId) {
  return collection().find({ curso_id: cursoId, aprobada: true })
    .sort({ fecha_resena: -1 })
    .toArray();
}

async function findByInstructor(instructorId) {
  return collection().find({ instructor_id: instructorId, aprobada: true })
    .sort({ fecha_resena: -1 })
    .toArray();
}

async function findOne(inscripcionId) {
  return collection().findOne({ inscripcion_id: inscripcionId });
}

async function create(data) {
  const result = await collection().insertOne(data);
  return { ...data, _id: result.insertedId };
}

async function update(id, data) {
  return collection().updateOne({ _id: id }, { $set: data });
}

module.exports = { findByCurso, findByInstructor, findOne, create, update };
