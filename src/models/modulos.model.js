'use strict';

// Modelo de la tabla `modulos`.
// id: uuid (gen_random_uuid()) -> NO se envía al crear.
// curso_id: uuid (FK a cursos.id) -> requerido.
const { crearModelo } = require('./crud.factory');

module.exports = crearModelo({
  tabla: 'modulos',
  idColumn: 'id',
  insertable: ['curso_id', 'titulo', 'descripcion', 'orden', 'duracion_total_min', 'es_gratuito'],
  updatable: ['titulo', 'descripcion', 'orden', 'duracion_total_min', 'es_gratuito'],
});
