'use strict';

const modelo = require('../models/mongo/cuestionariosRespuestas.model');
const { crearControladorMongo } = require('./mongo.crud.controller');

// fecha_intento tiene default (Date.now), así que no es obligatorio en el body.
module.exports = crearControladorMongo({
  modelo,
  recurso: 'Intento de cuestionario',
  requeridos: ['estudiante_id', 'leccion_id', 'preguntas_respuestas', 'calificacion'],
});
