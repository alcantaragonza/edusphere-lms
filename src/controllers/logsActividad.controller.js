'use strict';

const modelo = require('../models/mongo/logsActividad.model');
const { crearControladorMongo } = require('./mongo.crud.controller');

// timestamp tiene default (Date.now), así que no es obligatorio en el body.
module.exports = crearControladorMongo({
  modelo,
  recurso: 'Log de actividad',
  requeridos: ['usuario_id', 'tipo_evento'],
});
