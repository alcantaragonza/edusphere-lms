'use strict';

const controlador = require('../controllers/modulos.controller');
const { rutasCrud } = require('./crud.routes');

module.exports = rutasCrud(controlador);
