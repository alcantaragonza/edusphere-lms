'use strict';

// Acceso a datos para autenticación. Trabaja sobre la tabla `usuarios`,
// usando la columna `password_hash` (ver ALTER TABLE en docs/auth.sql).
const { query } = require('../config/db');

// Busca un usuario por email. Devuelve TODAS las columnas (incluye password_hash),
// porque el controller necesita el hash para comparar la contraseña en el login.
async function buscarPorEmail(email) {
  const { rows } = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return rows[0] || null;
}

// Crea un usuario con su hash de contraseña.
// RETURNING NO incluye password_hash, para nunca devolver el hash en la respuesta.
async function crearUsuario(datos) {
  const sql = `
    INSERT INTO usuarios
      (nombre, apellido, email, password_hash, rol, telefono, fecha_nacimiento, modificado_por)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, nombre, apellido, email, rol, fecha_registro`;
  const valores = [
    datos.nombre,
    datos.apellido,
    datos.email,
    datos.password_hash,
    datos.rol,
    datos.telefono ?? null,
    datos.fecha_nacimiento ?? null,
    // modificado_por es smallint NOT NULL sin default; 0 = "registro propio/sistema".
    datos.modificado_por ?? 0,
  ];
  const { rows } = await query(sql, valores);
  return rows[0];
}

module.exports = { buscarPorEmail, crearUsuario };
