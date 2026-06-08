'use strict';

const controlador = require('../controllers/modulos.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: autenticado. Escribir: instructor o admin.
module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('admin', 'instructor')],
});
