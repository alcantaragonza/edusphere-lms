'use strict';

const modelo = require('../models/mongo/resenas.model');
const { crearControladorMongo } = require('./mongo.crud.controller');
const { asyncWrap } = require('./crud.controller');
const { exigirRequeridos } = require('../middlewares/validar');

const CALIFICACIONES = [
  'calif_contenido', 'calif_claridad', 'calif_dificultad',
  'calif_valor', 'calif_instructor',
];

// Reutilizamos el factory para listar/obtener/actualizar/eliminar...
const base = crearControladorMongo({
  modelo,
  recurso: 'Reseña',
  requeridos: ['inscripcion_id', 'curso_id', 'estudiante_id', ...CALIFICACIONES],
});

// ...pero sobreescribimos `crear` para calcular calificacion_promedio a partir
// de las 5 calificaciones (1-5), redondeada a 2 decimales. Así el cliente no
// tiene que mandar el promedio (que el schema marca como requerido).
const crear = asyncWrap(async (req, res) => {
  exigirRequeridos(req.body, ['inscripcion_id', 'curso_id', 'estudiante_id', ...CALIFICACIONES]);
  const suma = CALIFICACIONES.reduce((acc, c) => acc + Number(req.body[c]), 0);
  req.body.calificacion_promedio = Math.round((suma / CALIFICACIONES.length) * 100) / 100;
  const creado = await modelo.create(req.body);
  res.status(201).json(creado);
});

module.exports = { ...base, crear };
