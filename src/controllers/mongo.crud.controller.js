'use strict';

// Factory de controllers CRUD para colecciones MongoDB (mongoose).
// Equivalente a crud.controller.js (PostgreSQL) pero sobre un Model de mongoose.
// Controllers DELGADOS: validan, llaman al modelo y devuelven JSON. Los errores
// de mongoose (ValidationError, CastError) los traduce el errorHandler central.
const mongoose = require('mongoose');
const { asyncWrap } = require('./crud.controller');
const { exigirRequeridos, ErrorValidacion } = require('../middlewares/validar');

// Valida que el :id de la ruta sea un ObjectId de Mongo (evita un CastError 500).
function exigirObjectId(valor) {
  if (!mongoose.isValidObjectId(valor)) {
    throw new ErrorValidacion(`El id '${valor}' no es un ObjectId de Mongo válido`);
  }
}

// config = {
//   modelo:      Model de mongoose
//   recurso:     nombre singular para los mensajes (ej. 'Reseña')
//   requeridos:  campos obligatorios en POST
// }
function crearControladorMongo(config) {
  const { modelo, recurso, requeridos = [] } = config;

  const crear = asyncWrap(async (req, res) => {
    exigirRequeridos(req.body, requeridos);
    const creado = await modelo.create(req.body);
    res.status(201).json(creado);
  });

  const listar = asyncWrap(async (req, res) => {
    // Paginación opcional ?limit=&offset= con valores por defecto seguros.
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const filas = await modelo.find().skip(offset).limit(limit).sort({ _id: 1 });
    res.json(filas);
  });

  const obtener = asyncWrap(async (req, res) => {
    exigirObjectId(req.params.id);
    const fila = await modelo.findById(req.params.id);
    if (!fila) {
      return res.status(404).json({ error: `${recurso} no encontrado`, detalle: `id=${req.params.id}` });
    }
    res.json(fila);
  });

  const actualizar = asyncWrap(async (req, res) => {
    exigirObjectId(req.params.id);
    // runValidators: aplica las reglas del schema también en el update.
    const fila = await modelo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!fila) {
      return res.status(404).json({ error: `${recurso} no encontrado`, detalle: `id=${req.params.id}` });
    }
    res.json(fila);
  });

  const eliminar = asyncWrap(async (req, res) => {
    exigirObjectId(req.params.id);
    const fila = await modelo.findByIdAndDelete(req.params.id);
    if (!fila) {
      return res.status(404).json({ error: `${recurso} no encontrado`, detalle: `id=${req.params.id}` });
    }
    res.status(200).json({ eliminado: true, id: fila._id });
  });

  return { crear, listar, obtener, actualizar, eliminar };
}

module.exports = { crearControladorMongo, exigirObjectId };
