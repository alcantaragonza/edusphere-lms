'use strict';

// Helper: monta las 5 rutas CRUD estándar de un recurso sobre un router,
// con middlewares opcionales de protección.
//   opciones.lectura    -> middlewares para GET (lista y por id)
//   opciones.escritura  -> middlewares para POST, PATCH, DELETE
//
//   POST   /         escritura -> crear
//   GET    /         lectura   -> listar
//   GET    /:id      lectura   -> obtener
//   PATCH  /:id      escritura -> actualizar
//   DELETE /:id      escritura -> eliminar
const express = require('express');

function rutasCrud(controlador, opciones = {}) {
  const router = express.Router();
  const lectura = opciones.lectura || [];
  const escritura = opciones.escritura || [];

  router.post('/', ...escritura, controlador.crear);
  router.get('/', ...lectura, controlador.listar);
  router.get('/:id', ...lectura, controlador.obtener);
  router.patch('/:id', ...escritura, controlador.actualizar);
  router.delete('/:id', ...escritura, controlador.eliminar);
  return router;
}

module.exports = { rutasCrud };
