'use strict';

// Modelo mongoose de la colección `logs_actividad`.
// Bitácora de eventos rastreables del usuario. metadata es variable según evento.
const { Schema, model, Types } = require('mongoose');

// Catálogo cerrado de eventos (debe coincidir con el enum del validador Mongo).
const TIPOS_EVENTO = [
  'leccion_iniciada', 'leccion_completada',
  'video_pausado', 'video_reanudado', 'video_completado',
  'cuestionario_iniciado', 'cuestionario_completado',
  'descarga_recurso', 'inscripcion_realizada',
  'certificado_emitido', 'resena_publicada',
  'login', 'logout',
];

// Contexto variable del evento. strict:false para tolerar metadata adicional.
const metadataSchema = new Schema(
  {
    curso_id: Types.UUID,
    leccion_id: Types.UUID,
    inscripcion_id: Types.UUID,
    tiempo_reproduccion: Number,
    porcentaje_visto: Number,
    puntuacion_quiz: Number,
    ip_origen: String,
    user_agent: String,
  },
  { _id: false, strict: false }
);

const logsActividadSchema = new Schema(
  {
    usuario_id: { type: Types.UUID, required: true },
    tipo_evento: { type: String, required: true, enum: TIPOS_EVENTO },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: metadataSchema,
  },
  { collection: 'logs_actividad', versionKey: false }
);

module.exports = model('LogsActividad', logsActividadSchema);
module.exports.TIPOS_EVENTO = TIPOS_EVENTO;
