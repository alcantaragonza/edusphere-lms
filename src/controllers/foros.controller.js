'use strict';

const modelo = require('../models/mongo/foros.model');
const { crearControladorMongo } = require('./mongo.crud.controller');

// parent_id y profundidad tienen default (null / 0): para un hilo raíz basta con
// enviar curso_id, estudiante_id y contenido (más titulo, recomendado en raíz).
module.exports = crearControladorMongo({
  modelo,
  recurso: 'Publicación de foro',
  requeridos: ['curso_id', 'estudiante_id', 'contenido'],
});
