'use strict';

const modelo = require('../models/cursos.model');
const { crearControlador } = require('./crud.controller');

module.exports = crearControlador({
  modelo,
  recurso: 'Curso',
  idTipo: 'uuid',
  requeridos: ['instructor_id', 'categoria_id', 'slug', 'titulo'],
});
