'use strict';

const modelo = require('../models/instructores.model');
const reportes = require('../models/reportes.model');
const { crearControlador, asyncWrap } = require('./crud.controller');
const { exigirIdParam, esFecha, ErrorValidacion } = require('../middlewares/validar');

// CRUD base. instructores.id es smallint y SIN default -> requerido al crear.
const crud = crearControlador({
  modelo,
  recurso: 'Instructor',
  idTipo: 'entero',
  requeridos: ['id', 'usuario_id'],
});

// RC-04: GET /api/instructores/:id/ingresos?desde=&hasta=
// fn_ingresos_instructor(smallint, date, date) RETURNS TABLE
// `desde` y `hasta` son opcionales: si no llegan, se usa todo el histórico
// (desde 1900-01-01 hasta hoy), así una llamada sin fechas no da 400.
const ingresos = asyncWrap(async (req, res) => {
  exigirIdParam(req.params.id, 'entero');
  const desde = req.query.desde || '1900-01-01';
  const hasta = req.query.hasta || new Date().toISOString().slice(0, 10);
  if (!esFecha(desde) || !esFecha(hasta)) {
    throw new ErrorValidacion("'desde' y 'hasta' deben ser fechas válidas (YYYY-MM-DD)");
  }
  const filas = await reportes.ingresosInstructor(Number(req.params.id), desde, hasta);
  res.json(filas);
});

module.exports = { ...crud, ingresos };
