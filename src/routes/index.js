'use strict';

// Router raíz: agrupa y monta TODOS los routers bajo /api.
const express = require('express');

const router = express.Router();

// Salud.
router.use('/', require('./health.routes')); // GET /api/health

// CRUD de recursos.
router.use('/usuarios', require('./usuarios.routes'));
router.use('/instructores', require('./instructores.routes'));
router.use('/estudiantes', require('./estudiantes.routes'));
router.use('/categorias', require('./categorias.routes'));
router.use('/cursos', require('./cursos.routes'));
router.use('/modulos', require('./modulos.routes'));
router.use('/lecciones', require('./lecciones.routes'));

// Operaciones críticas (SP): /api/inscripciones, /api/certificados.
router.use('/', require('./operaciones.routes'));

// Reportes globales (vistas/materializadas).
router.use('/reportes', require('./reportes.routes'));

module.exports = router;
