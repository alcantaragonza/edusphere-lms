'use strict';

const modelo = require('../models/carrito.model');
const { crearControlador } = require('./crud.controller');

module.exports = crearControlador({
  modelo,
  recurso: 'Item del carrito',
  idTipo: 'uuid',
  requeridos: ['estudiante_id', 'curso_id', 'precio_snapshot'],
});
