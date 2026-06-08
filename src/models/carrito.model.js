'use strict';

const { crearModelo } = require('./crud.factory');

module.exports = crearModelo({
  tabla: 'carrito_compras',
  idColumn: 'id',
  insertable: ['estudiante_id', 'curso_id', 'precio_snapshot'],
  updatable: ['precio_snapshot'],
});
