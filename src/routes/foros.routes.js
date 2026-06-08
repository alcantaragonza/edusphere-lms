'use strict';

const controlador = require('../controllers/foros.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: autenticado. Escribir: estudiantes publican/responden (o admin modera).
module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('estudiante', 'admin')],
});
