'use strict';

// Factory que genera las funciones de acceso a datos (CRUD) para una tabla.
// TODO el SQL vive aquí, en la capa de modelo, y va SIEMPRE parametrizado.
//
// config = {
//   tabla:       nombre EXACTO de la tabla en PostgreSQL
//   idColumn:    columna PK (por defecto 'id')
//   insertable:  columnas permitidas en INSERT (en orden deseado)
//   updatable:   columnas permitidas en UPDATE
// }
//
// Nota: los nombres de tabla/columna provienen de tu esquema (no de input del
// usuario), por eso es seguro interpolarlos para construir la sentencia; los
// VALORES siempre van como parámetros $1..$n.
const { query } = require('../config/db');

function crearModelo(config) {
  const { tabla, insertable, updatable } = config;
  const idColumn = config.idColumn || 'id';
  // Columnas sensibles que NUNCA deben salir en las respuestas (ej. password_hash).
  const ocultar = config.ocultar || [];

  // Toma de "data" solo las columnas permitidas y presentes (no undefined).
  function columnasPresentes(data, permitidas) {
    return permitidas.filter((col) => data[col] !== undefined);
  }

  // Quita las columnas ocultas de una fila antes de devolverla.
  function limpiar(row) {
    if (!row) return row;
    for (const col of ocultar) delete row[col];
    return row;
  }

  async function crear(data) {
    const cols = columnasPresentes(data, insertable);
    if (cols.length === 0) {
      const e = new Error('No se enviaron columnas válidas para crear');
      e.status = 400;
      throw e;
    }
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const valores = cols.map((col) => data[col]);
    const sql =
      `INSERT INTO ${tabla} (${cols.join(', ')}) ` +
      `VALUES (${placeholders.join(', ')}) RETURNING *`;
    const { rows } = await query(sql, valores);
    return limpiar(rows[0]);
  }

  async function listar({ limit = 50, offset = 0 } = {}) {
    const sql =
      `SELECT * FROM ${tabla} ORDER BY ${idColumn} LIMIT $1 OFFSET $2`;
    const { rows } = await query(sql, [limit, offset]);
    return rows.map(limpiar);
  }

  async function obtenerPorId(id) {
    const sql = `SELECT * FROM ${tabla} WHERE ${idColumn} = $1`;
    const { rows } = await query(sql, [id]);
    return limpiar(rows[0]) || null;
  }

  async function actualizar(id, data) {
    const cols = columnasPresentes(data, updatable);
    if (cols.length === 0) {
      const e = new Error('No se enviaron columnas válidas para actualizar');
      e.status = 400;
      throw e;
    }
    const sets = cols.map((col, i) => `${col} = $${i + 1}`);
    const valores = cols.map((col) => data[col]);
    // El id va como último parámetro.
    valores.push(id);
    const sql =
      `UPDATE ${tabla} SET ${sets.join(', ')} ` +
      `WHERE ${idColumn} = $${valores.length} RETURNING *`;
    const { rows } = await query(sql, valores);
    return limpiar(rows[0]) || null;
  }

  async function eliminar(id) {
    const sql = `DELETE FROM ${tabla} WHERE ${idColumn} = $1 RETURNING ${idColumn}`;
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }

  return { tabla, idColumn, crear, listar, obtenerPorId, actualizar, eliminar };
}

module.exports = { crearModelo };
