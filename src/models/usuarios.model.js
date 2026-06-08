'use strict';

// Modelo de la tabla `usuarios`. Columnas según db-edusphere.sql.
// id: uuid (gen_random_uuid()) -> NO se envía al crear.
// modificado_por: smallint NOT NULL -> requerido.
const { crearModelo } = require('./crud.factory');

module.exports = crearModelo({
  tabla: 'usuarios',
  idColumn: 'id',
  insertable: ['nombre', 'apellido', 'email', 'fecha_nacimiento', 'rol', 'modificado_por'],
  updatable: ['nombre', 'apellido', 'email', 'fecha_nacimiento', 'rol', 'modificado_por'],
  // Nunca exponer el hash de la contraseña en las respuestas del CRUD.
  ocultar: ['password_hash'],
});
