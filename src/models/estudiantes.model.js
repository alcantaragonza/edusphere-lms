'use strict';

// Modelo de la tabla `estudiantes`.
// id: uuid (gen_random_uuid()) -> NO se envía al crear.
// usuario_id: uuid UNIQUE (FK a usuarios.id) -> requerido.
const { crearModelo } = require('./crud.factory');

module.exports = crearModelo({
  tabla: 'estudiantes',
  idColumn: 'id',
  insertable: ['usuario_id', 'fecha_nacimiento', 'ocupacion', 'nivel_educativo', 'intereses'],
  updatable: ['fecha_nacimiento', 'ocupacion', 'nivel_educativo', 'intereses'],
});
