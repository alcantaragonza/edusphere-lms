'use strict';

const controlador = require('../controllers/cursos.controller');
const { rutasCrud } = require('./crud.routes');

module.exports = rutasCrud(controlador);
