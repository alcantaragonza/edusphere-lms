'use strict';

// Modelo mongoose de la colección `progreso_lecciones`.
// Refleja el validador $jsonSchema definido en db/Mongo/col-edusphere.js.
// Los *_id son UUID de PostgreSQL (binData en Mongo) -> tipo UUID de mongoose.
const { Schema, model, Types } = require('mongoose');

// Sub-documento: respuesta de un quiz dentro de una lección tipo cuestionario.
const quizRespuestaSchema = new Schema(
  {
    pregunta: String,
    respuesta: String,
    correcta: Boolean,
  },
  { _id: false }
);

// Sub-documento: progreso de UNA lección (array embebido, máx ~100 por curso).
const leccionProgresoSchema = new Schema(
  {
    leccion_id: { type: Types.UUID, required: true },
    completada: { type: Boolean, required: true },
    porcentaje_visto: { type: Number, required: true, min: 0, max: 100 },
    tiempo_dedicado_seg: { type: Number, required: true, min: 0 },
    fecha_inicio: { type: Date, required: true },
    fecha_completada: Date,
    quiz_respuestas: [quizRespuestaSchema],
  },
  { _id: false }
);

const progresoLeccionesSchema = new Schema(
  {
    inscripcion_id: { type: Types.UUID, required: true },
    curso_id: { type: Types.UUID, required: true }, // denormalizado
    estudiante_id: { type: Types.UUID, required: true }, // denormalizado
    progreso_lecciones: { type: [leccionProgresoSchema], required: true },
    ultima_leccion_vista: Types.UUID,
    porcentaje_total: { type: Number, required: true, min: 0, max: 100 },
    fecha_ultima_actividad: Date,
    fecha_inscripcion: Date, // denormalizado, inmutable (RC-09)
  },
  { collection: 'progreso_lecciones', versionKey: false }
);

module.exports = model('ProgresoLecciones', progresoLeccionesSchema);
