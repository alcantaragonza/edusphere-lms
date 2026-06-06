'use strict';

const express = require('express');
const controlador = require('../controllers/estudiantes.controller');
const { rutasCrud } = require('./crud.routes');

const router = express.Router();

// Endpoints de reporte ANTES del CRUD genérico.
// RC-03: GET /api/estudiantes/:id/cursos/:cursoId/avance -> fn_avance_estudiante
router.get('/:id/cursos/:cursoId/avance', controlador.avance);
// RC-02: GET /api/estudiantes/:id/cursos -> vw_cursos_estudiante
router.get('/:id/cursos', controlador.cursos);

// CRUD estándar.
router.use('/', rutasCrud(controlador));

module.exports = router;
