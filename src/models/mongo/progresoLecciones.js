const { getDb } = require('../../config/mongo');

const COLECCION = 'progreso_lecciones';

function collection() {
  return getDb().collection(COLECCION);
}

async function findByInscripcion(inscripcionId) {
  return collection().findOne({ inscripcion_id: inscripcionId });
}

async function findByEstudiante(estudianteId) {
  return collection().find({ estudiante_id: estudianteId }).toArray();
}

async function findByCurso(cursoId) {
  return collection().find({ curso_id: cursoId }).toArray();
}

async function create(data) {
  const result = await collection().insertOne(data);
  return { ...data, _id: result.insertedId };
}

async function updateProgreso(inscripcionId, leccionData) {
  return collection().updateOne(
    { inscripcion_id: inscripcionId, 'progreso_lecciones.leccion_id': leccionData.leccion_id },
    { $set: { 'progreso_lecciones.$': leccionData } }
  );
}

async function agregarLeccion(inscripcionId, leccionData) {
  return collection().updateOne(
    { inscripcion_id: inscripcionId },
    { $push: { progreso_lecciones: leccionData } }
  );
}

module.exports = { findByInscripcion, findByEstudiante, findByCurso, create, updateProgreso, agregarLeccion };
