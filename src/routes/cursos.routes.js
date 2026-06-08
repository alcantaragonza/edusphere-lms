'use strict';

const express = require('express');
const controlador = require('../controllers/cursos.controller');
const Resenas = require('../models/mongo/resenas.model');
const { rutasCrud } = require('./crud.routes');
const { asyncWrap } = require('../controllers/crud.controller');
const { autenticar, requiereRol } = require('../middlewares/auth');

const router = express.Router();

// GET /api/cursos/:id/resenas -> reseñas aprobadas del curso (MongoDB).
// Público: las reseñas son parte del catálogo. Se ordenan de más nueva a más vieja.
router.get('/:id/resenas', asyncWrap(async (req, res) => {
  const resenas = await Resenas.find({ curso_id: req.params.id, aprobada: true })
    .sort({ fecha_resena: -1 });
  res.json(resenas);
}));

// CRUD. Leer: público (el catálogo de cursos debe cargar sin token).
// Escribir: instructor o admin.
router.use('/', rutasCrud(controlador, {
  lectura: [],
  escritura: [autenticar, requiereRol('admin', 'instructor')],
}));

module.exports = router;
