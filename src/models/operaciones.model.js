'use strict';

// Operaciones críticas: invocan los STORED PROCEDURES que TÚ implementas en la BD.
// Aquí NO se define lógica de negocio: solo se hace CALL parametrizado.
const { pool } = require('../config/db');

// OC-01: inscribir estudiante en un curso.
// CALL sp_inscribir_estudiante(p_estudiante_id uuid, p_curso_id uuid)
// pendiente: objeto de BD que implementas tú (sp_inscribir_estudiante).
async function inscribirEstudiante(estudianteId, cursoId) {
  // Se usa un cliente dedicado por si el SP maneja su propia transacción.
  const client = await pool.connect();
  try {
    await client.query('CALL sp_inscribir_estudiante($1, $2)', [estudianteId, cursoId]);
    return { estudiante_id: estudianteId, curso_id: cursoId };
  } finally {
    client.release();
  }
}

// OC-02: emitir certificado para una inscripción.
// CALL sp_emitir_certificado(p_inscripcion_id uuid)
// pendiente: objeto de BD que implementas tú (sp_emitir_certificado).
async function emitirCertificado(inscripcionId) {
  const client = await pool.connect();
  try {
    await client.query('CALL sp_emitir_certificado($1)', [inscripcionId]);
    return { inscripcion_id: inscripcionId };
  } finally {
    client.release();
  }
}

module.exports = { inscribirEstudiante, emitirCertificado };
