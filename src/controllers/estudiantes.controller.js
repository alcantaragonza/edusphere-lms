'use strict';

const modelo = require('../models/estudiantes.model');
const reportes = require('../models/reportes.model');
const { crearControlador, asyncWrap } = require('./crud.controller');
const { exigirIdParam } = require('../middlewares/validar');

// CRUD base. estudiantes.id es uuid (gen_random_uuid()).
const crud = crearControlador({
  modelo,
  recurso: 'Estudiante',
  idTipo: 'uuid',
  requeridos: ['usuario_id'],
});

// RC-02: GET /api/estudiantes/:id/cursos  -> vw_cursos_estudiante
const cursos = asyncWrap(async (req, res) => {
  exigirIdParam(req.params.id, 'uuid');
  const filas = await reportes.cursosDeEstudiante(req.params.id);
  res.json(filas);
});

// RC-03: GET /api/estudiantes/:id/cursos/:cursoId/avance -> fn_avance_estudiante
const avance = asyncWrap(async (req, res) => {
  exigirIdParam(req.params.id, 'uuid');
  exigirIdParam(req.params.cursoId, 'uuid');
  const valor = await reportes.avanceEstudiante(req.params.id, req.params.cursoId);
  res.json({
    estudiante_id: req.params.id,
    curso_id: req.params.cursoId,
    avance: valor,
  });
});

module.exports = { ...crud, cursos, avance };
