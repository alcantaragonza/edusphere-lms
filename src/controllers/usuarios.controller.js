'use strict';

const modelo = require('../models/usuarios.model');
const { crearControlador } = require('./crud.controller');

module.exports = crearControlador({
  modelo,
  recurso: 'Usuario',
  idTipo: 'uuid',
  requeridos: ['nombre', 'apellido', 'email', 'rol', 'modificado_por'],
});
