'use strict';

// Controllers de las operaciones críticas (invocan SP vía el modelo).
const operaciones = require('../models/operaciones.model');
const { asyncWrap } = require('./crud.controller');
const { exigirRequeridos, esUuid, ErrorValidacion } = require('../middlewares/validar');

// OC-01: POST /api/inscripciones  { estudiante_id, curso_id }
const inscribir = asyncWrap(async (req, res) => {
  exigirRequeridos(req.body, ['estudiante_id', 'curso_id']);
  const { estudiante_id, curso_id } = req.body;
  if (!esUuid(estudiante_id) || !esUuid(curso_id)) {
    throw new ErrorValidacion('estudiante_id y curso_id deben ser UUID válidos');
  }
  const resultado = await operaciones.inscribirEstudiante(estudiante_id, curso_id);
  res.status(201).json({ ok: true, operacion: 'inscripcion', ...resultado });
});

// OC-02: POST /api/certificados  { inscripcion_id }
const emitirCertificado = asyncWrap(async (req, res) => {
  exigirRequeridos(req.body, ['inscripcion_id']);
  const { inscripcion_id } = req.body;
  if (!esUuid(inscripcion_id)) {
    throw new ErrorValidacion('inscripcion_id debe ser un UUID válido');
  }
  const resultado = await operaciones.emitirCertificado(inscripcion_id);
  res.status(201).json({ ok: true, operacion: 'certificado', ...resultado });
});

module.exports = { inscribir, emitirCertificado };
