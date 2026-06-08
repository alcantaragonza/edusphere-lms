CREATE OR REPLACE FUNCTION calcular_comision(
    p_monto NUMERIC,
    p_tasa  NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
    SELECT ROUND(p_monto * p_tasa / 100.0, 2);
$$;

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

    v_comision := calcular_comision(v_precio, v_tasa);

    INSERT INTO inscripciones (estudiante_id, curso_id, monto_pagado, tasa_comision_aplicada)
    VALUES (v_est_id, p_curso_id, v_precio, v_tasa)
    RETURNING id INTO v_ins_id;

    INSERT INTO pagos (inscripcion_id, monto, metodo_pago, referencia_pago, proveedor_pago, estado, detalles_pago)
    VALUES (
        v_ins_id,
        v_precio,
        p_metodo_pago,
        'ref-' || replace(gen_random_uuid()::text, '-', ''),
        'EduSphere Demo',
        'completado',
        jsonb_build_object('curso', p_curso_id, 'plataforma', 'EduSphere', 'tasa', v_tasa, 'comision', v_comision)
    );

    INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion)
    SELECT
        p_usuario_id,
        tao.id,
        'inscripciones',
        v_ins_id,
        jsonb_build_object('estudiante_id', v_est_id, 'curso_id', p_curso_id, 'monto', v_precio, 'tasa', v_tasa, 'comision', v_comision)
    FROM tipos_operacion_auditoria tao
    WHERE tao.nombre = 'inscripcion_curso';

    UPDATE cursos      SET total_estudiantes = total_estudiantes + 1 WHERE id = p_curso_id;
    UPDATE estudiantes SET total_cursos      = total_cursos + 1      WHERE id = v_est_id;
END;
$$;

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
    VALUES (
        p_inscripcion_id,
        v_codigo,
        'https://edusphere.app/certificados/' || v_codigo
    );

    SELECT e.usuario_id INTO v_user_id FROM estudiantes e WHERE e.id = v_estudiante;

    INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion)
    SELECT
        v_user_id,
        tao.id,
        'certificados',
        p_inscripcion_id,
        jsonb_build_object('codigo', v_codigo, 'curso_id', v_curso_id, 'estudiante_id', v_estudiante)
    FROM tipos_operacion_auditoria tao
    WHERE tao.nombre = 'emision_certificado';

    UPDATE inscripciones SET certificado_obtenido = true                 WHERE id = p_inscripcion_id;
    UPDATE estudiantes   SET total_certificados   = total_certificados + 1 WHERE id = v_estudiante;
END;
$$;
