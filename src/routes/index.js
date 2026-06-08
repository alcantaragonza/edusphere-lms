'use strict';

// Router raíz: agrupa y monta TODOS los routers bajo /api.
const express = require('express');

const router = express.Router();

// Salud.
router.use('/', require('./health.routes')); // GET /api/health

// Autenticación (registro / login).
router.use('/auth', require('./auth.routes'));

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

// Colecciones MongoDB (mongoose).
router.use('/progreso-lecciones', require('./progresoLecciones.routes'));
router.use('/logs-actividad', require('./logsActividad.routes'));
router.use('/resenas', require('./resenas.routes'));
router.use('/cuestionarios-respuestas', require('./cuestionariosRespuestas.routes'));
router.use('/foros', require('./foros.routes'));

module.exports = router;
