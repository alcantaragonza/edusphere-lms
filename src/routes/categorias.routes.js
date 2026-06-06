'use strict';

const controlador = require('../controllers/categorias.controller');
const { rutasCrud } = require('./crud.routes');

module.exports = rutasCrud(controlador);
