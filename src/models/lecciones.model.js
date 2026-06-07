'use strict';

// Modelo de la tabla `lecciones`.
// id: uuid (gen_random_uuid()) -> NO se envía al crear.
// modulo_id: uuid (FK a modulos.id) -> requerido.
// tipo: enum video/lectura/cuestionario/descarga -> requerido.
const { crearModelo } = require('./crud.factory');

const columnas = [
  'modulo_id', 'tipo', 'titulo', 'descripcion', 'contenido_url',
  'contenido_texto', 'duracion_minutos', 'orden', 'permite_descarga',
];

module.exports = crearModelo({
  tabla: 'lecciones',
  idColumn: 'id',
  insertable: columnas,
  updatable: ['tipo', 'titulo', 'descripcion', 'contenido_url', 'contenido_texto', 'duracion_minutos', 'orden', 'permite_descarga'],
});
