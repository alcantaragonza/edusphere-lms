'use strict';

// Rutas de reportes globales. Se montan bajo /api/reportes.
const express = require('express');
const controlador = require('../controllers/reportes.controller');

const router = express.Router();

router.get('/catalogo', controlador.catalogo);                 // RC-01
router.get('/ingresos-mensuales', controlador.ingresosMensuales); // RC-05
router.get('/top-cursos', controlador.topCursos);              // RC-06
router.get('/tasa-finalizacion', controlador.tasaFinalizacion); // RC-07

module.exports = router;
