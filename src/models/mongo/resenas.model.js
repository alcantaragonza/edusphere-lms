'use strict';

// Modelo mongoose de la colección `resenas`.
// Una reseña por inscripción (inscripcion_id único). Las 5 calificaciones van
// de 1 a 5; calificacion_promedio la calcula la app (ver controller).
const { Schema, model, Types } = require('mongoose');

const calif = { type: Number, required: true, min: 1, max: 5 };

const resenasSchema = new Schema(
  {
    inscripcion_id: { type: Types.UUID, required: true, unique: true },
    curso_id: { type: Types.UUID, required: true }, // denormalizado
    estudiante_id: { type: Types.UUID, required: true }, // denormalizado
    instructor_id: Types.UUID, // denormalizado, para agregación por instructor
    calif_contenido: calif,
    calif_claridad: calif,
    calif_dificultad: calif,
    calif_valor: calif,
    calif_instructor: calif,
    calificacion_promedio: { type: Number, required: true, min: 1, max: 5 },
    comentario: String,
    titulo_resena: String,
    fecha_resena: { type: Date, default: Date.now },
    editada: { type: Boolean, default: false },
    fecha_edicion: Date,
    aprobada: { type: Boolean, default: true }, // moderación: false = oculta
    util_count: { type: Number, default: 0 },
    reportada: { type: Boolean, default: false },
  },
  { collection: 'resenas', versionKey: false }
);

module.exports = model('Resenas', resenasSchema);
