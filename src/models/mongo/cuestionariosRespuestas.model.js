'use strict';

// Modelo mongoose de la colección `cuestionarios_respuestas`.
// Guarda el intento de un estudiante sobre el cuestionario de una lección.
const { Schema, model, Types } = require('mongoose');

// Sub-documento: una pregunta respondida dentro del intento.
const preguntaRespuestaSchema = new Schema(
  {
    pregunta_id: { type: Types.UUID, required: true },
    respuesta: { type: String, required: true },
    correcta: { type: Boolean, required: true },
  },
  { _id: false }
);

const cuestionariosRespuestasSchema = new Schema(
  {
    estudiante_id: { type: Types.UUID, required: true },
    leccion_id: { type: Types.UUID, required: true },
    preguntas_respuestas: { type: [preguntaRespuestaSchema], required: true },
    calificacion: { type: Number, required: true, min: 0, max: 100 }, // % aciertos
    puntaje_total: Number, // puntos obtenidos
    tiempo_total_seg: { type: Number, min: 0 },
    fecha_intento: { type: Date, required: true, default: Date.now },
    intento_numero: { type: Number, min: 1 }, // 1 = primer intento
  },
  { collection: 'cuestionarios_respuestas', versionKey: false }
);

module.exports = model('CuestionariosRespuestas', cuestionariosRespuestasSchema);
