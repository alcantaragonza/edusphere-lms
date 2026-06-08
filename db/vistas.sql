-- ==================================================================
-- EduSphere LMS — VISTAS POSTGRESQL (LOCALES)
-- ==================================================================
-- NOTA: Estas son las versiones LOCALES de las vistas, usadas para
-- las pruebas de rendimiento en Docker. Las versiones en Railway usan
-- el prefijo `vw_` porque el backend (feature/api) las referencia asi.
--
-- Las vistas equivalentes en Railway son:
--   v_catalogo_cursos  -> vw_catalogo_cursos_publicados
--   v_cursos_estudiante -> vw_cursos_estudiante
-- ==================================================================

-- ==================================================================
-- v_catalogo_cursos — VISTA NORMAL (RC-01 local)
-- ==================================================================
-- DIFERENCIA CON vw_catalogo_cursos_publicados (Railway):
--   - Incluye columnas adicionales: categoria_slug, categoria_color,
--     instructor_anios, instructor_calificacion
--   - Estas columnas extra son utiles para el frontend pero no son
--     requeridas por el backend de reportes.
--   - El backend espera las columnas `categoria` e `instructor` como
--     nombres exactos (sin alias adicionales).
CREATE VIEW v_catalogo_cursos AS
SELECT
    c.id,
    c.titulo,
    c.slug,
    c.descripcion,
    c.nivel,
    c.idioma,
    c.precio,
    c.precio_descuento,
    c.duracion_horas,
    c.calificacion_promedio,
    c.total_estudiantes,
    c.imagen_portada_url,
    c.fecha_publicacion,
    cat.nombre AS categoria,
    cat.slug AS categoria_slug,
    cat.color_hex AS categoria_color,
    u.nombre || ' ' || u.apellido AS instructor,
    ins.anos_experiencia AS instructor_anios,
    ins.calificacion_promedio AS instructor_calificacion
FROM cursos c
JOIN categorias cat ON cat.id = c.categoria_id
JOIN instructores ins ON ins.id = c.instructor_id
JOIN usuarios u ON u.id = ins.usuario_id
WHERE c.estado = 'publicado';

-- ==================================================================
-- v_cursos_estudiante — VISTA NORMAL (RC-02 local)
-- ==================================================================
-- DIFERENCIA CON vw_cursos_estudiante (Railway):
--   - Usa LATERAL con alias `stats` en vez de `s`
--   - La estructura de JOINs es identica
--   - La version de Railway resuelve el problema del `estudiante_id`
--     usando `e.usuario_id AS estudiante_id` para compatibilidad con
--     el frontend (que envia usuarios.id en vez de estudiantes.id)
CREATE VIEW v_cursos_estudiante AS
SELECT
    i.estudiante_id,
    i.id AS inscripcion_id,
    i.estado AS estado_inscripcion,
    i.fecha_inscripcion,
    i.monto_pagado,
    i.calificacion_final,
    i.certificado_obtenido,
    c.id AS curso_id,
    c.titulo AS curso_titulo,
    c.slug AS curso_slug,
    c.nivel AS curso_nivel,
    c.duracion_horas,
    u.nombre || ' ' || u.apellido AS instructor,
    COALESCE(stats.total_modulos, 0) AS total_modulos,
    COALESCE(stats.total_lecciones, 0) AS total_lecciones
FROM inscripciones i
JOIN cursos c ON c.id = i.curso_id
JOIN instructores ins ON ins.id = c.instructor_id
JOIN usuarios u ON u.id = ins.usuario_id
LEFT JOIN LATERAL (
    SELECT
        COUNT(DISTINCT m.id) AS total_modulos,
        COUNT(DISTINCT l.id) AS total_lecciones
    FROM modulos m
    LEFT JOIN lecciones l ON l.modulo_id = m.id
    WHERE m.curso_id = c.id
) stats ON true
WHERE i.estado IN ('activo', 'completado');

-- ==================================================================
-- vm_ingresos_mensuales — VISTA MATERIALIZADA (RC-05 local)
-- ==================================================================
-- PROPOSITO: Reporte de ingresos mensuales por categoria.
--
-- VISTA MATERIALIZADA vs NORMAL:
--   Una vista normal es solo una query guardada — se re-ejecuta cada
--   vez que se consulta. Una vista materializada ALMACENA el resultado
--   en disco. Las consultas son lecturas directas (Seq Scan sobre la
--   tabla materializada) sin JOINs ni agregaciones.
--
-- COSTO/BENEFICIO:
--   - Costo: ocupa espacio en disco y requiere REFRESH periodico
--   - Beneficio: consultas 85x mas rapidas (0.034ms vs 2.908ms)
--   - Justificacion: los ingresos no cambian intra-dia, refresh semanal
--     es suficiente para reportes gerenciales.
--
-- ESTRATEGIA DE REFRESH:
--   REFRESH MATERIALIZED VIEW vm_ingresos_mensuales;
--   Frecuencia: semanal (lunes 03:00 AM)
-- ==================================================================
CREATE MATERIALIZED VIEW vm_ingresos_mensuales AS
SELECT
    date_trunc('month', p.fecha_pago) AS mes,
    cat.nombre AS categoria,
    COUNT(DISTINCT i.id) AS total_inscripciones,
    SUM(p.monto) AS ingresos_totales,
    ROUND(AVG(p.monto), 2) AS ticket_promedio
FROM pagos p
JOIN inscripciones i ON i.id = p.inscripcion_id
JOIN cursos c ON c.id = i.curso_id
JOIN categorias cat ON cat.id = c.categoria_id
WHERE p.estado = 'completado'
GROUP BY date_trunc('month', p.fecha_pago), cat.nombre
ORDER BY mes DESC, ingresos_totales DESC;

-- ==================================================================
-- vm_top_cursos_vendidos — VISTA MATERIALIZADA (RC-06 local)
-- ==================================================================
-- PROPOSITO: Ranking de los 10 cursos con mas inscripciones pagadas.
--
-- `LIMIT 10` dentro de la vista materializada: la tabla resultante
--   siempre tiene exactamente 10 filas. Esto reduce el espacio en disco
--   y acelera las consultas (siempre es un Seq Scan de 10 filas).
--
-- Misma estrategia de refresh que vm_ingresos_mensuales.
-- ==================================================================
CREATE MATERIALIZED VIEW vm_top_cursos_vendidos AS
SELECT
    c.id,
    c.titulo,
    c.nivel,
    cat.nombre AS categoria,
    u.nombre || ' ' || u.apellido AS instructor,
    COUNT(i.id) AS total_inscritos,
    SUM(i.monto_pagado) AS ingresos_generados
FROM cursos c
JOIN categorias cat ON cat.id = c.categoria_id
JOIN instructores ins ON ins.id = c.instructor_id
JOIN usuarios u ON u.id = ins.usuario_id
JOIN inscripciones i ON i.curso_id = c.id
WHERE c.estado = 'publicado'
GROUP BY c.id, c.titulo, c.nivel, cat.nombre, u.nombre, u.apellido
ORDER BY total_inscritos DESC
LIMIT 10;

-- Consulta de verificacion (no es parte de la definicion de la vista)
select * from vm_top_cursos_vendidos;
