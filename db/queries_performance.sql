-- ============================================================
-- EduSphere LMS — Queries de Performance
-- Ejecutar ANTES y DESPUES de crear indices
-- Cada query incluye EXPLAIN ANALYZE para reporte de rendimiento
-- ============================================================

-- Q1: Catalogo de cursos publicados (RC-01)
-- JOIN cursos + instructores + categorias con filtros
EXPLAIN ANALYZE
SELECT
    c.titulo,
    c.slug,
    c.nivel,
    c.precio,
    c.precio_descuento,
    c.calificacion_promedio,
    c.total_estudiantes,
    cat.nombre AS categoria,
    u.nombre || ' ' || u.apellido AS instructor
FROM cursos c
JOIN categorias cat ON cat.id = c.categoria_id
JOIN instructores ins ON ins.id = c.instructor_id
JOIN usuarios u ON u.id = ins.usuario_id
WHERE c.estado = 'publicado'
ORDER BY c.total_estudiantes DESC;

-- Q2: Cursos de un estudiante con avance (RC-02)
-- JOIN inscripciones + cursos + modulos + conteo de lecciones
EXPLAIN ANALYZE
SELECT
    c.titulo,
    c.nivel,
    i.estado,
    i.fecha_inscripcion,
    i.monto_pagado,
    COUNT(DISTINCT m.id) AS total_modulos,
    COUNT(DISTINCT l.id) AS total_lecciones
FROM inscripciones i
JOIN cursos c ON c.id = i.curso_id
JOIN modulos m ON m.curso_id = c.id
JOIN lecciones l ON l.modulo_id = m.id
WHERE i.estado IN ('activo', 'completado')
GROUP BY c.id, c.titulo, c.nivel, i.estado, i.fecha_inscripcion, i.monto_pagado
ORDER BY i.fecha_inscripcion DESC;

-- Q3: Ingresos mensuales por categoria (RC-05)
-- Aggregation + JOIN con GROUP BY por mes
EXPLAIN ANALYZE
SELECT
    date_trunc('month', p.fecha_pago) AS mes,
    cat.nombre AS categoria,
    SUM(p.monto) AS ingresos_totales,
    COUNT(DISTINCT i.id) AS total_inscripciones
FROM pagos p
JOIN inscripciones i ON i.id = p.inscripcion_id
JOIN cursos c ON c.id = i.curso_id
JOIN categorias cat ON cat.id = c.categoria_id
WHERE p.estado = 'completado'
GROUP BY date_trunc('month', p.fecha_pago), cat.nombre
ORDER BY mes DESC, ingresos_totales DESC;

-- Q4: Top 10 cursos mas vendidos (RC-06)
-- COUNT + GROUP BY + ORDER BY + LIMIT
EXPLAIN ANALYZE
SELECT
    c.titulo,
    c.nivel,
    cat.nombre AS categoria,
    COUNT(i.id) AS total_inscritos,
    SUM(i.monto_pagado) AS ingresos_generados
FROM cursos c
JOIN categorias cat ON cat.id = c.categoria_id
JOIN inscripciones i ON i.curso_id = c.id
WHERE c.estado = 'publicado'
GROUP BY c.id, c.titulo, c.nivel, cat.nombre
ORDER BY total_inscritos DESC
LIMIT 10;

-- Q5: Ingresos por instructor en un rango de fechas (RC-04)
-- JOIN con filtros de fecha y agregacion
EXPLAIN ANALYZE
SELECT
    u.nombre || ' ' || u.apellido AS instructor,
    COUNT(DISTINCT i.id) AS total_inscripciones,
    SUM(p.monto) AS ingresos_brutos,
    ROUND(AVG(i.tasa_comision_aplicada), 2) AS comision_promedio,
    SUM(ROUND(p.monto * i.tasa_comision_aplicada / 100, 2)) AS comision_total
FROM instructores ins
JOIN usuarios u ON u.id = ins.usuario_id
JOIN cursos c ON c.instructor_id = ins.id
JOIN inscripciones i ON i.curso_id = c.id
JOIN pagos p ON p.inscripcion_id = i.id
WHERE p.estado = 'completado'
  AND p.fecha_pago >= '2025-06-01'
  AND p.fecha_pago < '2026-06-01'
GROUP BY ins.id, u.nombre, u.apellido
ORDER BY ingresos_brutos DESC;

-- Q6: Busqueda de certificados emitidos con datos del estudiante
-- Multiples JOINs con filtro de fecha y ordenamiento
EXPLAIN ANALYZE
SELECT
    u.nombre || ' ' || u.apellido AS estudiante,
    u.email,
    c.titulo AS curso,
    cert.codigo_certificado,
    cert.fecha_emision,
    i.calificacion_final
FROM certificados cert
JOIN inscripciones i ON i.id = cert.inscripcion_id
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN usuarios u ON u.id = e.usuario_id
JOIN cursos c ON c.id = i.curso_id
WHERE cert.activo = true
ORDER BY cert.fecha_emision DESC
LIMIT 50;
