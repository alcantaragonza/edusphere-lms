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

// Reseñas anidadas bajo cursos (patron REST: /cursos/:cursoId/resenas).
const resenasController = require('../controllers/resenas.controller');
const { autenticar } = require('../middlewares/auth');
const { asyncWrap } = require('../controllers/crud.controller');
const mongoose = require('mongoose');
router.get('/cursos/:cursoId/resenas', autenticar, asyncWrap(async (req, res) => {
  const Resena = require('../models/mongo/resenas.model');
  const cursoId = req.params.cursoId;
  const filas = await Resena.find({ curso_id: cursoId, aprobada: true }).sort({ fecha_resena: -1 });
  res.json(filas);
}));
router.post('/cursos/:cursoId/resenas', autenticar, asyncWrap(async (req, res) => {
  req.body.curso_id = req.params.cursoId;
  const Resena = require('../models/mongo/resenas.model');
  const creado = await Resena.create(req.body);
  res.status(201).json(creado);
}));

// Operaciones críticas (SP): /api/inscripciones, /api/certificados.
router.use('/', require('./operaciones.routes'));

// Reportes globales (vistas/materializadas).
router.use('/reportes', require('./reportes.routes'));

// Colecciones MongoDB (mongoose).
router.use('/progreso-lecciones', require('./progresoLecciones.routes'));
router.use('/progreso', require('./progresoLecciones.routes'));
router.use('/logs-actividad', require('./logsActividad.routes'));
router.use('/resenas', require('./resenas.routes'));
router.use('/cuestionarios-respuestas', require('./cuestionariosRespuestas.routes'));
router.use('/foros', require('./foros.routes'));

// Carrito de compras (PostgreSQL).
router.use('/carrito', require('./carrito.routes'));

// Cuestionarios: POST con funcion JS de procesamiento (requisito enunciado 5.3).
const { procesarRespuestas, ErrorValidacionCuestionario } = require('../services/procesarCuestionario');
router.post('/cuestionarios/respuestas', autenticar, asyncWrap(async (req, res) => {
  const doc = procesarRespuestas(req.body);
  const CuestionarioRespuesta = require('../models/mongo/cuestionariosRespuestas.model');
  const creado = await CuestionarioRespuesta.create(doc);
  res.status(201).json(creado);
}));

module.exports = router;
