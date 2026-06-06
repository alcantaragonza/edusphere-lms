'use strict';

const express = require('express');
const controlador = require('../controllers/instructores.controller');
const { rutasCrud } = require('./crud.routes');

const router = express.Router();

// Endpoint de reporte ANTES del CRUD genérico para que /:id/ingresos no choque.
// RC-04: GET /api/instructores/:id/ingresos?desde=&hasta=
router.get('/:id/ingresos', controlador.ingresos);

// CRUD estándar (POST /, GET /, GET /:id, PATCH /:id, DELETE /:id).
router.use('/', rutasCrud(controlador));

module.exports = router;
