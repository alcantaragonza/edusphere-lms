'use strict';

const modelo = require('../models/lecciones.model');
const { crearControlador } = require('./crud.controller');

module.exports = crearControlador({
  modelo,
  recurso: 'Lección',
  idTipo: 'uuid',
  requeridos: ['modulo_id', 'tipo', 'titulo'],
});
