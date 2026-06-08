'use strict';

const controlador = require('../controllers/progresoLecciones.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: autenticado. Escribir: el estudiante registra su propio progreso (o admin).
module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('estudiante', 'admin')],
});
