'use strict';

const modelo = require('../models/mongo/progresoLecciones.model');
const { crearControladorMongo } = require('./mongo.crud.controller');

module.exports = crearControladorMongo({
  modelo,
  recurso: 'Progreso de lecciones',
  requeridos: ['inscripcion_id', 'curso_id', 'estudiante_id', 'porcentaje_total'],
});
