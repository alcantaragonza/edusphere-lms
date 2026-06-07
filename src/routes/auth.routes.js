'use strict';

// Rutas de autenticación. Se montan bajo /api/auth.
const express = require('express');
const controlador = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();

router.post('/registro', controlador.registro); // público
router.post('/login', controlador.login);        // público
router.get('/yo', autenticar, controlador.yo);   // protegido: devuelve el usuario del token

module.exports = router;
