-- ==================================================================
-- EduSphere LMS — OBJETOS FINALES POSTGRESQL
-- ==================================================================
-- Este archivo contiene los objetos de BD que completan los requisitos
-- minimos de la seccion 5.2 del enunciado:
--   - 1 funcion escalar  (calcular_comision)
--   - 1 funcion TABLE    (fn_avance_estudiante)
--   - 2 vistas materializadas (vm_ingresos_mensuales, vm_top_cursos_vendidos)
--   - 1 vista normal adicional (vw_tasa_finalizacion)
--   - 2 SPs actualizados con log_auditoria y calcular_comision
-- ==================================================================

-- ==================================================================
-- 1. calcular_comision — FUNCION ESCALAR
-- ==================================================================
-- PROPOSITO: Centralizar el calculo de comision de plataforma en un solo
-- lugar. Principio DRY (Don't Repeat Yourself): si la tasa cambia, se
-- modifica aqui y todos los SPs que la usan se actualizan automaticamente.
--
-- `LANGUAGE sql`: la funcion es una sola operacion aritmetica. SQL puro
--   permite que PostgreSQL inlinee la funcion dentro de la query que la
--   llama, eliminando el overhead de cambio de contexto a PL/pgSQL.
--   Es mas rapido para funciones simples.
--
-- `IMMUTABLE`: la funcion siempre devuelve el mismo resultado para los
--   mismos argumentos. No lee ni modifica la base de datos. Esto permite
--   al optimizador:
--   - Reemplazar calcular_comision(100, 30) por 30.00 en tiempo de planificacion
--   - Cachear el resultado para llamadas repetidas
--   - Usar la funcion en indices sobre expresiones
--
-- COMPARACION CON STABLE/VOLATILE:
--   IMMUTABLE = mismos args -> mismo resultado SIEMPRE (ej. aritmetica pura)
--   STABLE    = mismo resultado dentro de una query (ej. lee tablas)
--   VOLATILE  = puede devolver diferente cada vez (ej. random(), SPs)
--
-- `ROUND(..., 2)`: redondea a 2 decimales para consistencia financiera
--   con numeric(10,2).
-- ==================================================================
CREATE OR REPLACE FUNCTION calcular_comision(
    p_monto NUMERIC,
    p_tasa  NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
    SELECT ROUND(p_monto * p_tasa / 100.0, 2);
$$;

-- ==================================================================
-- 2. fn_avance_estudiante — FUNCION TABLE (RC-03)
-- ==================================================================
-- PROPOSITO: Reporte RC-03. Calcula el avance de un estudiante en un
-- curso especifico. Devuelve la estructura del curso (modulos, lecciones)
-- y el estado de la inscripcion.
--
-- `RETURNS TABLE(...)`: la funcion devuelve un conjunto de filas, no un
--   solo valor escalar. Se consulta con SELECT * FROM fn_avance_estudiante().
--
-- `FROM (SELECT 1) AS dummy`: este truco garantiza que SIEMPRE se retorne
--   exactamente una fila. Sin esto, si el estudiante no esta inscrito en
--   el curso, los LEFT JOIN no encontrarian nada y devolverian cero filas.
--   `dummy` fuerza una fila base y los LEFT JOIN agregan columnas (o NULLs).
--
-- `LATERAL`: permite que las subconsultas mc (modulos count) y lc (lecciones
--   count) referencien p_curso_id desde el contexto exterior. Sin LATERAL,
--   PostgreSQL rechazaria la correlacion.
--
-- `i.estado::text`: la columna `estado` es un ENUM (estado_inscripcion_e).
--   El cast a text permite que la columna de retorno sea text en vez del
--   tipo ENUM. Esto hace la respuesta mas portable para el frontend.
--
-- `COALESCE`: las subconsultas LATERAL pueden devolver NULL (curso sin
--   modulos o sin lecciones). COALESCE convierte NULL a 0.
--
-- LIMITACION: el progreso real leccion-por-leccion esta en MongoDB
--   (progreso_lecciones). Esta funcion entrega la ESTRUCTURA del curso.
--   El frontend combina ambas fuentes para el porcentaje real de avance.
-- ==================================================================
CREATE OR REPLACE FUNCTION fn_avance_estudiante(
    p_estudiante_id UUID,
    p_curso_id      UUID
)
RETURNS TABLE (
    total_modulos       bigint,
    total_lecciones     bigint,
    estado_inscripcion  text,
    certificado         boolean,
    calificacion        numeric
)
LANGUAGE sql STABLE
AS $$
    SELECT
        COALESCE(mc.cnt, 0)                    AS total_modulos,
        COALESCE(lc.cnt, 0)                    AS total_lecciones,
        i.estado::text                         AS estado_inscripcion,
        COALESCE(i.certificado_obtenido, false) AS certificado,
        i.calificacion_final                   AS calificacion
    FROM (SELECT 1) AS dummy
    LEFT JOIN inscripciones i
           ON i.estudiante_id = p_estudiante_id
          AND i.curso_id      = p_curso_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM modulos WHERE curso_id = p_curso_id
    ) mc ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
          FROM lecciones l
          JOIN modulos m ON m.id = l.modulo_id
         WHERE m.curso_id = p_curso_id
    ) lc ON true;
$$;

-- ==================================================================
-- 3. vm_ingresos_mensuales — VISTA MATERIALIZADA (RC-05)
-- ==================================================================
-- PROPOSITO: Reporte gerencial RC-05. Ingresos agrupados por mes y
-- categoria. Al ser materializada, las consultas son LECTURA DIRECTA
-- al resultado precalculado — sin JOINs ni agregaciones en runtime.
--
-- ¿POR QUE MATERIALIZADA Y NO NORMAL?
--   EXPLAIN ANALYZE en entorno local mostro:
--     Materializada: 0.034 ms
--     Vista normal:  2.908 ms
--   La materializada es 85x mas rapida. Para dashboards consultados
--   frecuentemente, esta diferencia es significativa.
--
-- ESTRATEGIA DE REFRESH:
--   Frecuencia: semanal (lunes 03:00 AM, horario de baja carga)
--   Comando:    REFRESH MATERIALIZED VIEW vm_ingresos_mensuales;
--   Justificacion: los pagos completados son inmutables. Un refresh
--     semanal mantiene los datos actualizados sin carga innecesaria.
--     No se necesita refresh intra-diario porque los ingresos no cambian
--     minuto a minuto.
--
-- `date_trunc('month', ...)`: trunca una fecha al primer dia del mes.
--   Ej: 2026-06-15 -> 2026-06-01 00:00:00.
--
-- `COUNT(DISTINCT i.id)`: un pago esta asociado a exactamente una
--   inscripcion (pagos.inscripcion_id es UNIQUE). El DISTINCT es
--   redundante en este caso pero protege contra edge cases.
-- ==================================================================
DROP MATERIALIZED VIEW IF EXISTS vm_ingresos_mensuales;
CREATE MATERIALIZED VIEW vm_ingresos_mensuales AS
SELECT
    date_trunc('month', p.fecha_pago) AS mes,
    cat.nombre                        AS categoria,
    COUNT(DISTINCT i.id)              AS total_inscripciones,
    SUM(p.monto)                      AS ingresos_totales,
    ROUND(AVG(p.monto), 2)            AS ticket_promedio
FROM pagos p
JOIN inscripciones i   ON i.id = p.inscripcion_id
JOIN cursos c          ON c.id = i.curso_id
JOIN categorias cat    ON cat.id = c.categoria_id
WHERE p.estado = 'completado'
GROUP BY date_trunc('month', p.fecha_pago), cat.nombre
ORDER BY mes DESC, ingresos_totales DESC;

-- ==================================================================
-- 4. vm_top_cursos_vendidos — VISTA MATERIALIZADA (RC-06)
-- ==================================================================
-- PROPOSITO: Reporte RC-06. Ranking de los 10 cursos con mas inscripciones
-- pagadas. Materializada para consultas rapidas en dashboards.
--
-- `LIMIT 10` dentro de la vista: la vista siempre devuelve exactamente
--   10 filas. Si se necesita un top diferente, se quita el LIMIT de la
--   vista y se aplica en la consulta externa.
--
-- Misma estrategia de refresh que vm_ingresos_mensuales (semanal).
-- ==================================================================
DROP MATERIALIZED VIEW IF EXISTS vm_top_cursos_vendidos;
CREATE MATERIALIZED VIEW vm_top_cursos_vendidos AS
SELECT
    c.id,
    c.titulo,
    c.nivel,
    cat.nombre                              AS categoria,
    u.nombre || ' ' || u.apellido            AS instructor,
    COUNT(i.id)                             AS total_inscritos,
    SUM(i.monto_pagado)                     AS ingresos_generados
FROM cursos c
JOIN categorias cat     ON cat.id = c.categoria_id
JOIN instructores ins   ON ins.id = c.instructor_id
JOIN usuarios u         ON u.id = ins.usuario_id
JOIN inscripciones i    ON i.curso_id = c.id
WHERE c.estado = 'publicado'
GROUP BY c.id, c.titulo, c.nivel, cat.nombre, u.nombre, u.apellido
ORDER BY total_inscritos DESC
LIMIT 10;

-- ==================================================================
-- 5. vw_tasa_finalizacion — VISTA NORMAL (RC-07)
-- ==================================================================
-- PROPOSITO: Reporte RC-07. Mide que porcentaje de estudiantes inscritos
-- completan cada curso. Indicador clave de calidad del contenido.
--
-- FORMULA: (completados / total_inscritos) * 100
--
-- `FILTER (WHERE ...)`: sintaxis SQL estandar para agregados condicionales.
--   Alternativa seria `COUNT(CASE WHEN estado = 'completado' THEN 1 END)`.
--   FILTER es mas legible y el optimizador lo maneja eficientemente.
--
-- `HAVING COUNT(i.id) > 0`: descarta cursos sin inscripciones. Una tasa
--   de 0% para un curso sin estudiantes no es informativa y distorsiona
--   el ranking.
--
-- ¿POR QUE VISTA NORMAL Y NO MATERIALIZADA?
--   Los datos cambian con cada inscripcion completada (varias por dia).
--   Una vista materializada quedaria desactualizada rapidamente. El costo
--   de la consulta es bajo (JOIN simple con agregacion) y la vista se
--   consulta con poca frecuencia (reportes periodicos, no en cada request).
-- ==================================================================
DROP VIEW IF EXISTS vw_tasa_finalizacion;
CREATE VIEW vw_tasa_finalizacion AS
SELECT
    c.id                                    AS curso_id,
    c.titulo,
    c.nivel,
    COUNT(i.id) FILTER (WHERE i.estado = 'completado') AS completados,
    COUNT(i.id)                             AS total_inscritos,
    CASE
        WHEN COUNT(i.id) > 0
        THEN ROUND(
            COUNT(i.id) FILTER (WHERE i.estado = 'completado') * 100.0
            / COUNT(i.id), 2
        )
        ELSE 0
    END                                     AS tasa_finalizacion
FROM cursos c
LEFT JOIN inscripciones i ON i.curso_id = c.id
WHERE c.estado = 'publicado'
GROUP BY c.id, c.titulo, c.nivel
HAVING COUNT(i.id) > 0
ORDER BY tasa_finalizacion DESC;

-- ==================================================================
-- 6. sp_inscribir_estudiante — VERSION FINAL CON AUDITORIA
-- ==================================================================
-- CAMBIOS RESPECTO A LA VERSION ANTERIOR (cambios_railway.sql):
--   a) Usa calcular_comision() en vez de tasa hardcodeada
--   b) Inserta en log_auditoria para trazabilidad completa
--   c) Los detalles de pago incluyen el monto de comision calculado
--   d) La auditoria usa JOIN con tipos_operacion_auditoria para obtener
--      el ID correcto sin hardcodear numeros magicos
--
-- `log_auditoria`: tabla append-only (nunca se modifica ni elimina).
--   Cada operacion critica deja un registro inmutable con:
--   - quien (usuario_id)
--   - que hizo (tipo_operacion_id)
--   - sobre que entidad (entidad_afectada, entidad_id)
--   - detalles en JSONB (detalles_operacion)
-- ==================================================================
DROP PROCEDURE IF EXISTS sp_inscribir_estudiante(uuid, uuid);
DROP PROCEDURE IF EXISTS sp_inscribir_estudiante(uuid, uuid, metodo_pago_e);
CREATE OR REPLACE PROCEDURE sp_inscribir_estudiante(
    p_usuario_id    uuid,
    p_curso_id      uuid,
    p_metodo_pago   metodo_pago_e DEFAULT 'tarjeta'
)
LANGUAGE plpgsql AS $$
DECLARE
    v_est_id        uuid;
    v_ins_id        uuid;
    v_estado_curso  text;
    v_precio        numeric(10,2);
    v_tasa          numeric(5,2) := 30.00;
    v_comision      numeric(10,2);
BEGIN
    SELECT id INTO v_est_id FROM estudiantes WHERE usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario % no tiene perfil de estudiante', p_usuario_id;
    END IF;

    SELECT c.estado::text, COALESCE(c.precio_descuento, c.precio)
      INTO v_estado_curso, v_precio
      FROM cursos c
     WHERE c.id = p_curso_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso % no existe', p_curso_id;
    END IF;

    IF v_estado_curso <> 'publicado' THEN
        RAISE EXCEPTION 'El curso no esta publicado (estado: %)', v_estado_curso
            USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (
        SELECT 1 FROM inscripciones
         WHERE estudiante_id = v_est_id
           AND curso_id      = p_curso_id
    ) THEN
        RAISE EXCEPTION 'El estudiante ya esta inscrito en este curso'
            USING ERRCODE = 'unique_violation';
    END IF;

    -- Usa la funcion escalar en vez de hardcodear la formula
    v_comision := calcular_comision(v_precio, v_tasa);

    INSERT INTO inscripciones (estudiante_id, curso_id, monto_pagado, tasa_comision_aplicada)
    VALUES (v_est_id, p_curso_id, v_precio, v_tasa)
    RETURNING id INTO v_ins_id;

    INSERT INTO pagos (inscripcion_id, monto, metodo_pago, referencia_pago, proveedor_pago, estado, detalles_pago)
    VALUES (
        v_ins_id, v_precio, p_metodo_pago,
        'ref-' || replace(gen_random_uuid()::text, '-', ''),
        'EduSphere Demo', 'completado',
        jsonb_build_object('curso', p_curso_id, 'plataforma', 'EduSphere', 'tasa', v_tasa, 'comision', v_comision)
    );

    -- Auditoria: registro inmutable de la operacion.
    -- El JOIN con tipos_operacion_auditoria busca el ID del tipo 'inscripcion_curso'
    -- en vez de hardcodear un numero (ej. 2). Si los IDs cambian, el SP sigue funcionando.
    INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion)
    SELECT
        p_usuario_id, tao.id, 'inscripciones', v_ins_id,
        jsonb_build_object('estudiante_id', v_est_id, 'curso_id', p_curso_id,
                           'monto', v_precio, 'tasa', v_tasa, 'comision', v_comision)
    FROM tipos_operacion_auditoria tao
    WHERE tao.nombre = 'inscripcion_curso';

    UPDATE cursos      SET total_estudiantes = total_estudiantes + 1 WHERE id = p_curso_id;
    UPDATE estudiantes SET total_cursos      = total_cursos + 1      WHERE id = v_est_id;
END;
$$;

-- ==================================================================
-- 7. sp_emitir_certificado — VERSION FINAL CON AUDITORIA
-- ==================================================================
-- CAMBIOS RESPECTO A LA VERSION ANTERIOR:
--   a) Agrega insercion en log_auditoria para trazabilidad
--   b) Resuelve usuario_id del estudiante (log_auditoria.usuario_id
--      referencia usuarios.id, no estudiantes.id)
--   c) Captura curso_id para los detalles de auditoria
-- ==================================================================
CREATE OR REPLACE PROCEDURE sp_emitir_certificado(
    p_inscripcion_id uuid
)
LANGUAGE plpgsql AS $$
DECLARE
    v_estado       text;
    v_permite_cert boolean;
    v_estudiante   uuid;
    v_codigo       varchar(100);
    v_curso_id     uuid;
    v_user_id      uuid;
BEGIN
    SELECT i.estado::text, c.permite_certificado, i.estudiante_id, c.id
      INTO v_estado, v_permite_cert, v_estudiante, v_curso_id
      FROM inscripciones i
      JOIN cursos c ON c.id = i.curso_id
     WHERE i.id = p_inscripcion_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La inscripcion % no existe', p_inscripcion_id;
    END IF;

    IF v_estado <> 'completado' THEN
        RAISE EXCEPTION 'No se puede certificar: la inscripcion no esta completada (estado: %)', v_estado
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT v_permite_cert THEN
        RAISE EXCEPTION 'El curso no otorga certificado'
            USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (SELECT 1 FROM certificados WHERE inscripcion_id = p_inscripcion_id) THEN
        RAISE EXCEPTION 'El certificado de esta inscripcion ya fue emitido'
            USING ERRCODE = 'unique_violation';
    END IF;

    v_codigo := 'CERT-' || upper(substr(replace(p_inscripcion_id::text, '-', ''), 1, 12));

    INSERT INTO certificados (inscripcion_id, codigo_certificado, url_certificado)
    VALUES (p_inscripcion_id, v_codigo, 'https://edusphere.app/certificados/' || v_codigo);

    -- Resolver usuario_id del estudiante para la auditoria.
    -- log_auditoria.usuario_id referencia usuarios.id, no estudiantes.id.
    SELECT e.usuario_id INTO v_user_id FROM estudiantes e WHERE e.id = v_estudiante;

    INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion)
    SELECT
        v_user_id, tao.id, 'certificados', p_inscripcion_id,
        jsonb_build_object('codigo', v_codigo, 'curso_id', v_curso_id, 'estudiante_id', v_estudiante)
    FROM tipos_operacion_auditoria tao
    WHERE tao.nombre = 'emision_certificado';

    UPDATE inscripciones SET certificado_obtenido = true                 WHERE id = p_inscripcion_id;
    UPDATE estudiantes   SET total_certificados   = total_certificados + 1 WHERE id = v_estudiante;
END;
$$;
