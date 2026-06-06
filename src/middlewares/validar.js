'use strict';

// Helpers de validación MANUAL (sin librerías externas como zod/joi).
// Se usan en los controllers para validar el body/params antes de tocar la BD.

// Error de validación tipado: el errorHandler lo traduce a HTTP 400.
class ErrorValidacion extends Error {
  constructor(detalle) {
    super('Datos de entrada inválidos');
    this.name = 'ErrorValidacion';
    this.status = 400;
    this.detalle = detalle; // string o array de strings
  }
}

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGEX_EMAIL = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

function esUuid(valor) {
  return typeof valor === 'string' && REGEX_UUID.test(valor);
}

function esEmail(valor) {
  return typeof valor === 'string' && REGEX_EMAIL.test(valor);
}

// Entero (acepta number o string numérica entera). Útil para smallint ids.
function esEntero(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor);
  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number.isInteger(Number(valor));
  }
  return false;
}

// Número decimal/financiero (precio, montos).
function esNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor);
  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number.isFinite(Number(valor));
  }
  return false;
}

// Fecha en formato ISO (YYYY-MM-DD o timestamp). Devuelve true si Date la parsea.
function esFecha(valor) {
  if (typeof valor !== 'string') return false;
  const t = Date.parse(valor);
  return !Number.isNaN(t);
}

// Devuelve la lista de campos requeridos que faltan (null/undefined/'' cuenta como faltante).
function camposFaltantes(obj, requeridos) {
  if (!obj || typeof obj !== 'object') return requeridos.slice();
  return requeridos.filter((campo) => {
    const v = obj[campo];
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  });
}

// Lanza ErrorValidacion si faltan requeridos.
function exigirRequeridos(obj, requeridos) {
  const faltan = camposFaltantes(obj, requeridos);
  if (faltan.length > 0) {
    throw new ErrorValidacion(
      `Faltan campos requeridos: ${faltan.join(', ')}`
    );
  }
}

// Valida que un parámetro id de la ruta tenga el tipo correcto ('uuid' | 'entero').
function exigirIdParam(valor, tipo) {
  if (tipo === 'uuid' && !esUuid(valor)) {
    throw new ErrorValidacion(`El id '${valor}' no es un UUID válido`);
  }
  if (tipo === 'entero' && !esEntero(valor)) {
    throw new ErrorValidacion(`El id '${valor}' no es un entero válido`);
  }
}

module.exports = {
  ErrorValidacion,
  esUuid,
  esEmail,
  esEntero,
  esNumero,
  esFecha,
  camposFaltantes,
  exigirRequeridos,
  exigirIdParam,
};
