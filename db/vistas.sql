-- ============================================================
-- EduSphere LMS — Vistas PostgreSQL
-- RC-01, RC-02: Vistas normales
-- RC-05, RC-06: Vistas materializadas
-- ============================================================

-- RC-01: Catalogo de cursos publicados
-- Muestra cursos activos con instructor y categoria
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

-- RC-02: Cursos del estudiante con modulos y lecciones
-- JOIN inscripciones + cursos + instructores + conteos
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

-- RC-05: Ingresos mensuales por categoria
-- Vista materializada con estrategia de refresh semanal/mensual
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

-- RC-06: Top 10 cursos mas vendidos
-- Vista materializada con estrategia de refresh semanal
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

select * from vm_top_cursos_vendidos;
