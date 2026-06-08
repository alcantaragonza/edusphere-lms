'use strict';

// Modelo mongoose de la colección `foros`.
// Hilos y respuestas anidadas (auto-referencia vía parent_id -> foros._id).
//   parent_id: null  => hilo raíz (profundidad 0); titulo obligatorio.
//   parent_id: _id   => respuesta; hereda ancestro_raiz_id del hilo raíz.
const { Schema, model, Types } = require('mongoose');

const forosSchema = new Schema(
  {
    curso_id: { type: Types.UUID, required: true },
    estudiante_id: { type: Types.UUID, required: true }, // autor
    titulo: String, // obligatorio para hilos raíz (se valida en el controller)
    contenido: { type: String, required: true },
    // Auto-referencias a foros._id (ObjectId). null = hilo raíz.
    parent_id: { type: Schema.Types.ObjectId, ref: 'Foros', default: null },
    ancestro_raiz_id: { type: Schema.Types.ObjectId, ref: 'Foros', default: null },
    profundidad: { type: Number, required: true, min: 0, default: 0 },
    likes_count: { type: Number, min: 0, default: 0 },
    likes_usuarios: [Types.UUID], // estudiantes.id que dieron like
    editado: { type: Boolean, default: false },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_modificacion: { type: Date, default: null },
    resuelto: { type: Boolean, default: false },
    reportado: { type: Boolean, default: false },
  },
  { collection: 'foros', versionKey: false }
);

module.exports = model('Foros', forosSchema);
