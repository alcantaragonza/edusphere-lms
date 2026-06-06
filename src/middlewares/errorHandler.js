'use strict';

// Middleware central de errores. Express 5 lo invoca cuando un controller
// hace next(err) o lanza dentro de un wrapper async.
// Traduce errores de validación y códigos de error de PostgreSQL a HTTP + JSON.

// Mapa de códigos SQLSTATE de pg a respuestas HTTP legibles.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
function mapearErrorPg(err) {
  switch (err.code) {
    case '23505': // unique_violation
      return { status: 409, error: 'Conflicto: el registro ya existe', detalle: err.detail || err.message };
    case '23503': // foreign_key_violation
      return { status: 409, error: 'Conflicto: referencia inexistente (FK)', detalle: err.detail || err.message };
    case '23502': // not_null_violation
      return { status: 400, error: 'Campo obligatorio faltante', detalle: `Columna '${err.column}' no admite null` };
    case '23514': // check_violation
      return { status: 400, error: 'Restricción de validación (CHECK) no cumplida', detalle: err.constraint || err.message };
    case '22P02': // invalid_text_representation (ej. uuid o entero mal formado)
      return { status: 400, error: 'Formato de dato inválido', detalle: err.message };
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return { status: 400, error: 'Formato de fecha inválido', detalle: err.message };
    case 'P0001': // raise_exception: errores lanzados desde tus SP/funciones con RAISE
      return { status: 409, error: 'Operación rechazada por la base de datos', detalle: err.message };
    case '42883': // undefined_function: la función/SP aún no existe en tu BD
    case '42P01': // undefined_table: la vista/tabla aún no existe en tu BD
      return { status: 501, error: 'Objeto de BD no implementado todavía', detalle: err.message };
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars  (Express exige los 4 parámetros)
function errorHandler(err, req, res, next) {
  // 1) Errores de validación manual.
  if (err.name === 'ErrorValidacion' || err.status === 400) {
    return res.status(err.status || 400).json({
      error: err.message || 'Datos de entrada inválidos',
      detalle: err.detalle || null,
    });
  }

  // 2) Errores propagados con un status explícito (404, 409, ...).
  if (err.status && !err.code) {
    return res.status(err.status).json({
      error: err.message || 'Error',
      detalle: err.detalle || null,
    });
  }

  // 3) Errores de PostgreSQL.
  if (err.code) {
    const mapeado = mapearErrorPg(err);
    if (mapeado) {
      return res.status(mapeado.status).json({
        error: mapeado.error,
        detalle: mapeado.detalle,
      });
    }
  }

  // 4) Cualquier otra cosa: 500.
  console.error('[errorHandler] error no controlado:', err);
  return res.status(500).json({
    error: 'Error interno del servidor',
    detalle: process.env.NODE_ENV === 'production' ? null : err.message,
  });
}

module.exports = errorHandler;
