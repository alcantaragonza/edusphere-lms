'use strict';

const express = require('express');
const controlador = require('../controllers/estudiantes.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

const router = express.Router();

// Endpoints de reporte (autenticados) ANTES del CRUD genérico.
// RC-03: avance del estudiante en un curso.
router.get('/:id/cursos/:cursoId/avance', autenticar, controlador.avance);
// RC-02: cursos del estudiante.
router.get('/:id/cursos', autenticar, controlador.cursos);

// CRUD: leer autenticado, escribir solo admin.
router.use('/', rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('admin')],
}));

module.exports = router;
