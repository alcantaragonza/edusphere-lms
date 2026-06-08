'use strict';

// Modelo de la tabla `instructores`.
// id: smallint SIN default -> el cliente DEBE enviarlo al crear.
// usuario_id: uuid UNIQUE (FK a usuarios.id).
const { crearModelo } = require('./crud.factory');

module.exports = crearModelo({
  tabla: 'instructores',
  idColumn: 'id',
  insertable: ['id', 'usuario_id', 'biografia', 'anos_experiencia', 'metodo_pago', 'referencia_pago'],
  updatable: ['biografia', 'anos_experiencia', 'metodo_pago', 'referencia_pago'],
});
