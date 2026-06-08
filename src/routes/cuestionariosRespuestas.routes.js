'use strict';

const controlador = require('../controllers/cuestionariosRespuestas.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: autenticado. Escribir: el estudiante envía su intento (o admin).
module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('estudiante', 'admin')],
});
