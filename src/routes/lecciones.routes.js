'use strict';

const controlador = require('../controllers/lecciones.controller');
const { rutasCrud } = require('./crud.routes');

module.exports = rutasCrud(controlador);
