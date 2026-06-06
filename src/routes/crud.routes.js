'use strict';

// Helper: monta las 5 rutas CRUD estándar de un recurso sobre un router.
//   POST   /         crear
//   GET    /         listar
//   GET    /:id      obtener
//   PATCH  /:id      actualizar
//   DELETE /:id      eliminar
const express = require('express');

function rutasCrud(controlador) {
  const router = express.Router();
  router.post('/', controlador.crear);
  router.get('/', controlador.listar);
  router.get('/:id', controlador.obtener);
  router.patch('/:id', controlador.actualizar);
  router.delete('/:id', controlador.eliminar);
  return router;
}

module.exports = { rutasCrud };
