-- ==================================================================
-- EduSphere LMS — QUERIES DE PERFORMANCE (EXPLAIN ANALYZE)
-- ==================================================================
-- PROPOSITO: Estas 6 consultas se ejecutan DOS VECES durante la Fase 1
-- del plan de trabajo:
--   1. SIN indices — para obtener la linea base de rendimiento
--   2. CON indices  — para medir la mejora y justificar cada indice
--
-- `EXPLAIN ANALYZE`: ejecuta la query REALMENTE y muestra:
--   - Planning Time: tiempo que tardo el planificador en elegir estrategia
--   - Execution Time: tiempo REAL de ejecucion (el que importa)
--   - Plan: arbol de operaciones (Seq Scan, Index Scan, Hash Join, etc.)
--   - Rows removed by filter: filas leidas pero descartadas (oportunidad de indice)
--
-- Los resultados de estas queries se usan en el Reporte de Performance
-- (seccion 5.5 del enunciado) para demostrar el impacto de los indices.
-- ==================================================================

-- ==================================================================
-- Q1: CATALOGO DE CURSOS PUBLICADOS (simula RC-01)
-- ==================================================================
-- OBJETIVO: Medir rendimiento de JOINs entre 3 tablas con filtro WHERE.
--
-- INDICES QUE AFECTAN ESTA QUERY:
--   - idx_cursos_estado (WHERE c.estado = 'publicado')
--   - idx_cursos_instructor_id (JOIN con instructores)
--   - idx_cursos_categoria_id (JOIN con categorias)
--   - idx_cursos_total_estudiantes DESC (ORDER BY)
--
-- RESULTADO ESPERADO CON 50 CURSOS:
--   Sin indices: Seq Scan sobre cursos (50 filas) + Hash Joins
--   Con indices:  Bitmap Index Scan sobre idx_cursos_estado + Nested Loop
--   Diferencia: minima con pocos datos, critica con >1000 cursos
-- ==================================================================
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

-- ==================================================================
-- Q2: CURSOS DEL ESTUDIANTE CON AVANCE (simula RC-02)
-- ==================================================================
-- OBJETIVO: Medir rendimiento de multiples JOINs con agregacion.
-- Es la query mas pesada porque involucra 4 tablas y COUNT(DISTINCT).
--
-- INDICES QUE AFECTAN ESTA QUERY:
--   - idx_inscripciones_estado (WHERE i.estado IN (...))
--   - idx_inscripciones_curso_id (JOIN con cursos)
--   - idx_modulos_curso_id (JOIN con modulos)
--   - idx_lecciones_modulo_id (JOIN con lecciones)
--   - idx_inscripciones_fecha (ORDER BY)
--
-- RESULTADO ESPERADO CON 696 INSCRIPCIONES:
--   Sin indices: Seq Scan sobre todas las tablas + Hash Joins
--   Con indices:  Nested Loop con Index Scans
--   Esta query muestra la MAYOR diferencia porque involucra mas filas
--   y los indices en FKs son determinantes.
-- ==================================================================
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

-- ==================================================================
-- Q3: INGRESOS MENSUALES POR CATEGORIA (simula RC-05)
-- ==================================================================
-- OBJETIVO: Medir rendimiento de agregacion con GROUP BY sobre fechas.
--
-- INDICES QUE AFECTAN ESTA QUERY:
--   - idx_pagos_estado (WHERE p.estado = 'completado')
--   - idx_pagos_estado_fecha (filtro + GROUP BY por mes)
--   - idx_inscripciones_curso_id (JOIN con cursos)
--   - idx_cursos_categoria_id (JOIN con categorias)
--
-- `date_trunc('month', p.fecha_pago)`: agrupa por mes. Sin indice en
--   fecha_pago, PostgreSQL debe ordenar todos los pagos para agrupar.
-- ==================================================================
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

-- ==================================================================
-- Q4: TOP 10 CURSOS MAS VENDIDOS (simula RC-06)
-- ==================================================================
-- OBJETIVO: Medir COUNT + GROUP BY + ORDER BY + LIMIT.
--
-- INDICES QUE AFECTAN ESTA QUERY:
--   - idx_inscripciones_curso_id (COUNT agrupado por curso)
--   - idx_cursos_estado (WHERE c.estado = 'publicado')
--   - idx_cursos_categoria_id (JOIN con categorias)
-- ==================================================================
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

-- ==================================================================
-- Q5: INGRESOS POR INSTRUCTOR EN RANGO DE FECHAS (simula RC-04)
-- ==================================================================
-- OBJETIVO: JOIN de 5 tablas con filtro de rango de fechas.
--
-- INDICES QUE AFECTAN ESTA QUERY:
--   - idx_pagos_estado (WHERE p.estado = 'completado')
--   - idx_pagos_fecha_pago (WHERE p.fecha_pago BETWEEN ...)
--   - idx_pagos_estado_fecha (compuesto: ambos filtros juntos)
--   - idx_inscripciones_curso_id (JOIN)
--   - idx_cursos_instructor_id (JOIN)
--
-- `BETWEEN`: el indice en fecha_pago convierte un Seq Scan en un
--   Index Range Scan, que solo lee las filas dentro del rango.
-- ==================================================================
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

-- ==================================================================
-- Q6: CERTIFICADOS EMITIDOS CON DATOS DEL ESTUDIANTE
-- ==================================================================
-- OBJETIVO: Multiples JOINs con filtro booleano y ordenamiento.
--
-- INDICES QUE AFECTAN ESTA QUERY:
--   - idx_certificados_activo_fecha (WHERE activo = true + ORDER BY fecha_emision)
--   - PK de cada tabla (JOINs)
--
-- `LIMIT 50`: con el indice compuesto, PostgreSQL puede hacer un
--   Index Scan y detenerse despues de 50 filas (no necesita leer
--   toda la tabla).
-- ==================================================================
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
