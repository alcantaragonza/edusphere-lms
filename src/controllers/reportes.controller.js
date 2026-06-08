'use strict';

// Controllers de reportes globales (vistas / materializadas).
const reportes = require('../models/reportes.model');
const { asyncWrap } = require('./crud.controller');

// RC-01: GET /api/reportes/catalogo
const catalogo = asyncWrap(async (req, res) => {
  res.json(await reportes.catalogoCursos());
});

// RC-05: GET /api/reportes/ingresos-mensuales
const ingresosMensuales = asyncWrap(async (req, res) => {
  res.json(await reportes.ingresosMensuales());
});

// RC-06: GET /api/reportes/top-cursos
const topCursos = asyncWrap(async (req, res) => {
  res.json(await reportes.topCursosTrimestre());
});

// RC-07: GET /api/reportes/tasa-finalizacion
const tasaFinalizacion = asyncWrap(async (req, res) => {
  res.json(await reportes.tasaFinalizacion());
});

module.exports = { catalogo, ingresosMensuales, topCursos, tasaFinalizacion };
