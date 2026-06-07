'use strict';

const controlador = require('../controllers/usuarios.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Leer: cualquier usuario autenticado. Escribir: solo admin.
module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar, requiereRol('admin')],
});
