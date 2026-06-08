'use strict';

const controlador = require('../controllers/logsActividad.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Escribir: cualquier usuario autenticado genera eventos.
// Leer: solo admin (es bitácora de auditoría, dato sensible).
module.exports = rutasCrud(controlador, {
  lectura: [autenticar, requiereRol('admin')],
  escritura: [autenticar],
});
