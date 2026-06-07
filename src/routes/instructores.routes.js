'use strict';

const express = require('express');
const controlador = require('../controllers/instructores.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

const router = express.Router();

// RC-04: ingresos del instructor. Lo ven instructor o admin (autenticados).
router.get('/:id/ingresos', autenticar, requiereRol('admin', 'instructor'), controlador.ingresos);

// CRUD: leer autenticado, escribir solo admin.
router.use('/', rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('admin')],
}));

module.exports = router;
