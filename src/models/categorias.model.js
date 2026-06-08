'use strict';

// Modelo de la tabla `categorias`.
// id: smallint SIN default -> el cliente DEBE enviarlo al crear.
// slug: UNIQUE.
const { crearModelo } = require('./crud.factory');

module.exports = crearModelo({
  tabla: 'categorias',
  idColumn: 'id',
  insertable: ['id', 'nombre', 'slug', 'descripcion', 'icono_url', 'color_hex', 'activa'],
  updatable: ['nombre', 'slug', 'descripcion', 'icono_url', 'color_hex', 'activa'],
});
