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
const ingresos = asyncWrap(async (req, res) => {
  exigirIdParam(req.params.id, 'entero');
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    throw new ErrorValidacion("Se requieren los query params 'desde' y 'hasta' (YYYY-MM-DD)");
  }
  if (!esFecha(desde) || !esFecha(hasta)) {
    throw new ErrorValidacion("'desde' y 'hasta' deben ser fechas válidas (YYYY-MM-DD)");
  }
  const filas = await reportes.ingresosInstructor(Number(req.params.id), desde, hasta);
  res.json(filas);
});

module.exports = { ...crud, ingresos };
