'use strict';

const controlador = require('../controllers/carrito.controller');
const { rutasCrud } = require('./crud.routes');
const { autenticar } = require('../middlewares/auth');

module.exports = rutasCrud(controlador, {
  lectura: [autenticar],
  escritura: [autenticar],
});
