'use strict';

// Rutas de operaciones críticas (invocan SP). Se montan directamente en /api.
const express = require('express');
const controlador = require('../controllers/operaciones.controller');
const { autenticar, requiereRol } = require('../middlewares/auth');

const router = express.Router();

// OC-01: inscribirse -> estudiante o admin.
router.post('/inscripciones', autenticar, requiereRol('estudiante', 'admin'), controlador.inscribir);
// OC-02: emitir certificado -> instructor o admin.
router.post('/certificados', autenticar, requiereRol('admin', 'instructor'), controlador.emitirCertificado);

module.exports = router;
