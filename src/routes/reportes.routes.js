'use strict';

// Rutas de reportes globales. Se montan bajo /api/reportes.
const express = require('express');
const controlador = require('../controllers/reportes.controller');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();

router.get('/catalogo', controlador.catalogo);                          // RC-01 (público)
router.get('/ingresos-mensuales', autenticar, controlador.ingresosMensuales); // RC-05
router.get('/top-cursos', autenticar, controlador.topCursos);           // RC-06
router.get('/tasa-finalizacion', autenticar, controlador.tasaFinalizacion);   // RC-07

module.exports = router;
