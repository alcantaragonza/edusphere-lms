'use strict';

// Modelo de la tabla `cursos`.
// id: uuid (gen_random_uuid()) -> NO se envía al crear.
// OJO: la columna de estado se llama `categoria` (enum borrador/publicado/archivado),
// distinta de `categoria_id` (FK a categorias). Se respetan ambos nombres tal cual.
const { crearModelo } = require('./crud.factory');

const columnas = [
  'instructor_id', 'categoria_id', 'categoria', 'nivel', 'slug', 'titulo',
  'descripcion', 'idioma', 'imagen_portada_url', 'precio', 'precio_descuento',
  'duracion_horas', 'permite_certificado', 'fecha_publicacion',
];

module.exports = crearModelo({
  tabla: 'cursos',
  idColumn: 'id',
  insertable: columnas,
  updatable: columnas,
});
