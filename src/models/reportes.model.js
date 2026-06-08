'use strict';

// Reportes: SOLO leen de las VISTAS / MATERIALIZADAS / FUNCIONES que TÚ implementas.
// Aquí no hay lógica: SELECT * FROM <vista> o SELECT <fn>($1, ...).
// Si algún objeto aún no existe en tu BD, el endpoint queda armado y el
// errorHandler responde 501 (undefined_table / undefined_function).
const { query } = require('../config/db');

// RC-01: catálogo de cursos publicados.  // pendiente: objeto de BD (vista) que implementas tú.
async function catalogoCursos() {
  const { rows } = await query('SELECT * FROM vw_catalogo_cursos_publicados');
  return rows;
}

// RC-02: cursos de un estudiante.  // pendiente: objeto de BD (vista) que implementas tú.
// La vista vw_cursos_estudiante se filtra por la columna del estudiante.
async function cursosDeEstudiante(estudianteId) {
  const { rows } = await query(
    'SELECT * FROM vw_cursos_estudiante WHERE estudiante_id = $1',
    [estudianteId]
  );
  return rows;
}

// RC-03: avance (%) de un estudiante en un curso.  // pendiente: función que implementas tú.
// SELECT fn_avance_estudiante(p_estudiante_id uuid, p_curso_id uuid) RETURNS numeric
async function avanceEstudiante(estudianteId, cursoId) {
  const { rows } = await query(
    'SELECT fn_avance_estudiante($1, $2) AS avance',
    [estudianteId, cursoId]
  );
  return rows[0] ? rows[0].avance : null;
}

// RC-04: ingresos de un instructor en un rango de fechas.  // pendiente: función que implementas tú.
// fn_ingresos_instructor(p_instructor_id smallint, p_desde date, p_hasta date) RETURNS TABLE
async function ingresosInstructor(instructorId, desde, hasta) {
  const { rows } = await query(
    'SELECT * FROM fn_ingresos_instructor($1, $2, $3)',
    [instructorId, desde, hasta]
  );
  return rows;
}

// RC-05: ingresos mensuales (materializada).  // pendiente: objeto de BD (mv) que implementas tú.
async function ingresosMensuales() {
  const { rows } = await query('SELECT * FROM mv_ingresos_mensuales');
  return rows;
}

// RC-06: top cursos del trimestre (materializada).  // pendiente: objeto de BD (mv) que implementas tú.
async function topCursosTrimestre() {
  const { rows } = await query('SELECT * FROM mv_top_cursos_trimestre');
  return rows;
}

// RC-07: tasa de finalización (vista).  // pendiente: objeto de BD (vista) que implementas tú.
async function tasaFinalizacion() {
  const { rows } = await query('SELECT * FROM vw_tasa_finalizacion');
  return rows;
}

module.exports = {
  catalogoCursos,
  cursosDeEstudiante,
  avanceEstudiante,
  ingresosInstructor,
  ingresosMensuales,
  topCursosTrimestre,
  tasaFinalizacion,
};
