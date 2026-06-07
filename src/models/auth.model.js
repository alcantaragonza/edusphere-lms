'use strict';

// Acceso a datos para autenticación. Trabaja sobre la tabla `usuarios`,
// usando la columna `password_hash` (ver ALTER TABLE en docs/auth.sql).
const { pool, query } = require('../config/db');

// Busca un usuario por email. Devuelve TODAS las columnas (incluye password_hash),
// porque el controller necesita el hash para comparar la contraseña en el login.
async function buscarPorEmail(email) {
  const { rows } = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return rows[0] || null;
}

// Crea un usuario con su hash de contraseña.
// RETURNING NO incluye password_hash, para nunca devolver el hash en la respuesta.
//
// Todo ocurre dentro de UNA transacción: según el rol también se crea su fila
// de perfil (instructor -> `instructores`, estudiante -> `estudiantes`), de modo
// que el usuario recién registrado ya tenga su perfil y su id usable como FK
// (p. ej. instructor_id en `cursos`). Si algo falla, se hace ROLLBACK y no queda
// un usuario a medias. El rol 'admin' no tiene tabla de perfil.
async function crearUsuario(datos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // modificado_por es UUID (FK a usuarios.id). En el registro propio nadie lo
    // modifica, así que no se envía y la columna queda en NULL.
    const sql = `
      INSERT INTO usuarios
        (nombre, apellido, email, password_hash, rol, telefono, fecha_nacimiento)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nombre, apellido, email, rol, fecha_registro`;
    const valores = [
      datos.nombre,
      datos.apellido,
      datos.email,
      datos.password_hash,
      datos.rol,
      datos.telefono ?? null,
      datos.fecha_nacimiento ?? null,
    ];
    const { rows } = await client.query(sql, valores);
    const usuario = rows[0];

    if (usuario.rol === 'instructor') {
      // instructores.id es smallint SIN default, así que lo calculamos a mano.
      // El LOCK evita que dos registros simultáneos generen el mismo id (race).
      await client.query('LOCK TABLE instructores IN SHARE ROW EXCLUSIVE MODE');
      const { rows: filas } = await client.query(
        `INSERT INTO instructores (id, usuario_id)
         VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM instructores), $1)
         RETURNING id`,
        [usuario.id]
      );
      usuario.instructor_id = filas[0].id;
    } else if (usuario.rol === 'estudiante') {
      // estudiantes.id es UUID con default gen_random_uuid(): no se calcula a
      // mano ni hace falta LOCK; basta insertar el usuario_id.
      const { rows: filas } = await client.query(
        `INSERT INTO estudiantes (usuario_id)
         VALUES ($1)
         RETURNING id`,
        [usuario.id]
      );
      usuario.estudiante_id = filas[0].id;
    }

    await client.query('COMMIT');
    return usuario;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { buscarPorEmail, crearUsuario };
