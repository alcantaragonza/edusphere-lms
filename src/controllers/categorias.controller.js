'use strict';

const modelo = require('../models/categorias.model');
const { crearControlador } = require('./crud.controller');

// categorias.id es smallint y SIN default -> requerido al crear.
module.exports = crearControlador({
  modelo,
  recurso: 'Categoría',
  idTipo: 'entero',
  requeridos: ['id', 'nombre', 'slug'],
});
