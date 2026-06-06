'use strict';

// Rutas de operaciones críticas (invocan SP). Se montan directamente en /api.
const express = require('express');
const controlador = require('../controllers/operaciones.controller');

const router = express.Router();

// OC-01
router.post('/inscripciones', controlador.inscribir);
// OC-02
router.post('/certificados', controlador.emitirCertificado);

module.exports = router;
