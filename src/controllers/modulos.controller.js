'use strict';

const modelo = require('../models/modulos.model');
const { crearControlador } = require('./crud.controller');

module.exports = crearControlador({
  modelo,
  recurso: 'Módulo',
  idTipo: 'uuid',
  requeridos: ['curso_id', 'titulo'],
});
