'use strict';

const controlador = require('../controllers/cursos.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: público (el catálogo de cursos debe cargar sin token).
// Escribir: instructor o admin.
module.exports = rutasCrud(controlador, {
  lectura: [],
  escritura: [autenticar, requiereRol('admin', 'instructor')],
});
