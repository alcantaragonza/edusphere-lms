'use strict';

const controlador = require('../controllers/categorias.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: público (las categorías del catálogo deben cargar sin token).
// Escribir: solo admin.
module.exports = rutasCrud(controlador, {
  lectura: [],
  escritura: [autenticar, requiereRol('admin')],
});
