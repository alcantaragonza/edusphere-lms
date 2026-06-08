'use strict';

const controlador = require('../controllers/resenas.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: autenticado. Escribir: el estudiante publica su reseña (o admin modera).
module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('estudiante', 'admin')],
});
