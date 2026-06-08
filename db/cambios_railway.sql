-- ============================================================
-- EduSphere LMS — Cambios aplicados en Railway
-- Sesion 2026-06-08: SPs, funcion, vistas, trigger, schema
-- Ejecutar en orden — algunos objetos requieren DROP previo
-- ============================================================

-- 1. Columna categoria (backend espera este nombre en vez de estado)
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS categoria estado_curso_e NOT NULL DEFAULT 'borrador';
UPDATE cursos SET categoria = estado;

-- 2. Trigger: mantiene categoria y estado sincronizados
CREATE OR REPLACE FUNCTION sync_categoria_estado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.estado = NEW.categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_categoria_estado ON cursos;
CREATE TRIGGER trg_sync_categoria_estado
  BEFORE INSERT OR UPDATE ON cursos
  FOR EACH ROW
  EXECUTE FUNCTION sync_categoria_estado();

-- 3. OC-01: sp_inscribir_estudiante
-- Recibe usuario_id, resuelve a estudiante_id internamente
-- Inserta inscripcion + pago con comision 30%
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
        jsonb_build_object('curso', p_curso_id, 'plataforma', 'EduSphere', 'tasa', v_tasa)
    );

    UPDATE cursos      SET total_estudiantes = total_estudiantes + 1 WHERE id = p_curso_id;
    UPDATE estudiantes SET total_cursos      = total_cursos + 1      WHERE id = v_est_id;
END;
$$;

-- 4. OC-02: sp_emitir_certificado
CREATE OR REPLACE PROCEDURE sp_emitir_certificado(
    p_inscripcion_id uuid
)
LANGUAGE plpgsql AS $$
DECLARE
    v_estado       text;
    v_permite_cert boolean;
    v_estudiante   uuid;
    v_codigo       varchar(100);
BEGIN
    SELECT i.estado::text, c.permite_certificado, i.estudiante_id
      INTO v_estado, v_permite_cert, v_estudiante
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

    UPDATE inscripciones SET certificado_obtenido = true                 WHERE id = p_inscripcion_id;
    UPDATE estudiantes   SET total_certificados   = total_certificados + 1 WHERE id = v_estudiante;
END;
$$;

-- 5. RC-04: fn_ingresos_instructor
CREATE OR REPLACE FUNCTION fn_ingresos_instructor(
    p_instructor_id smallint,
    p_desde         date,
    p_hasta         date
)
RETURNS TABLE (
    curso_id            uuid,
    titulo              varchar,
    total_inscripciones bigint,
    ingreso_bruto       numeric,
    ingreso_neto        numeric
)
LANGUAGE sql STABLE AS $$
    SELECT
        c.id,
        c.titulo,
        COUNT(i.id)                                                            AS total_inscripciones,
        COALESCE(SUM(i.monto_pagado), 0)                                       AS ingreso_bruto,
        COALESCE(SUM(i.monto_pagado * (1 - i.tasa_comision_aplicada / 100)), 0) AS ingreso_neto
      FROM cursos c
      LEFT JOIN inscripciones i
             ON i.curso_id = c.id
            AND i.fecha_inscripcion::date BETWEEN p_desde AND p_hasta
     WHERE c.instructor_id = p_instructor_id
     GROUP BY c.id, c.titulo
     ORDER BY ingreso_neto DESC;
$$;

-- 6. RC-01: vw_catalogo_cursos_publicados
DROP VIEW IF EXISTS vw_catalogo_cursos_publicados;
CREATE VIEW vw_catalogo_cursos_publicados AS
SELECT
    c.id                              AS curso_id,
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
    c.permite_certificado,
    c.fecha_publicacion,
    cat.nombre                        AS categoria,
    (u.nombre || ' ' || u.apellido)   AS instructor
  FROM cursos c
  JOIN categorias  cat ON cat.id = c.categoria_id
  JOIN instructores ins ON ins.id = c.instructor_id
  JOIN usuarios     u   ON u.id   = ins.usuario_id
 WHERE c.estado = 'publicado';

-- 7. RC-02: vw_cursos_estudiante
DROP VIEW IF EXISTS vw_cursos_estudiante;
CREATE VIEW vw_cursos_estudiante AS
SELECT
    e.usuario_id AS estudiante_id,
    e.id AS estudiante_real_id,
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
    COALESCE(s.total_modulos, 0) AS total_modulos,
    COALESCE(s.total_lecciones, 0) AS total_lecciones
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
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
) s ON true
WHERE i.estado IN ('activo', 'completado');

-- 8. Corregir comision en inscripciones existentes
UPDATE inscripciones SET tasa_comision_aplicada = 30.00 WHERE tasa_comision_aplicada = 0.00;
