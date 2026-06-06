'use strict';

const controlador = require('../controllers/usuarios.controller');
const { rutasCrud } = require('./crud.routes');

module.exports = rutasCrud(controlador);
