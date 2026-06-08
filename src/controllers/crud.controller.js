'use strict';

// Factory de controllers CRUD. Controllers DELGADOS: validan, llaman al modelo
// y devuelven JSON. Cada handler está envuelto para que cualquier rejection
// async llegue al errorHandler central (Express 5 no lo hace solo).
const { exigirRequeridos, exigirIdParam } = require('../middlewares/validar');

// Envuelve un handler async y enruta sus errores a next().
function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// config = {
//   modelo:      objeto devuelto por crearModelo()
//   recurso:     nombre singular para los mensajes (ej. 'usuario')
//   idTipo:      'uuid' | 'entero'  (para validar :id de la ruta)
//   requeridos:  columnas obligatorias en POST
// }
function crearControlador(config) {
  const { modelo, recurso, idTipo, requeridos = [] } = config;

  const crear = asyncWrap(async (req, res) => {
    exigirRequeridos(req.body, requeridos);
    const creado = await modelo.crear(req.body);
    res.status(201).json(creado);
  });

  const listar = asyncWrap(async (req, res) => {
    // Paginación opcional ?limit=&offset= con valores por defecto seguros.
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const filas = await modelo.listar({ limit, offset });
    res.json(filas);
  });

  const obtener = asyncWrap(async (req, res) => {
    exigirIdParam(req.params.id, idTipo);
    const fila = await modelo.obtenerPorId(req.params.id);
    if (!fila) {
      return res.status(404).json({ error: `${recurso} no encontrado`, detalle: `id=${req.params.id}` });
    }
    res.json(fila);
  });

  const actualizar = asyncWrap(async (req, res) => {
    exigirIdParam(req.params.id, idTipo);
    const fila = await modelo.actualizar(req.params.id, req.body);
    if (!fila) {
      return res.status(404).json({ error: `${recurso} no encontrado`, detalle: `id=${req.params.id}` });
    }
    res.json(fila);
  });

  const eliminar = asyncWrap(async (req, res) => {
    exigirIdParam(req.params.id, idTipo);
    const fila = await modelo.eliminar(req.params.id);
    if (!fila) {
      return res.status(404).json({ error: `${recurso} no encontrado`, detalle: `id=${req.params.id}` });
    }
    res.status(200).json({ eliminado: true, id: fila[modelo.idColumn] });
  });

  return { crear, listar, obtener, actualizar, eliminar };
}

module.exports = { crearControlador, asyncWrap };
