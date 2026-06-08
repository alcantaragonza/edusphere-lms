-- OC-01: sp_inscribir_estudiante
CREATE OR REPLACE PROCEDURE sp_inscribir_estudiante(
    p_estudiante_id uuid,
    p_curso_id      uuid
)
LANGUAGE plpgsql AS $$
DECLARE
    v_estado_curso text;
    v_precio       numeric(10,2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM estudiantes WHERE id = p_estudiante_id) THEN
        RAISE EXCEPTION 'El estudiante % no existe', p_estudiante_id;
    END IF;

    SELECT c.estado::text, COALESCE(c.precio_descuento, c.precio)
      INTO v_estado_curso, v_precio
      FROM cursos c
     WHERE c.id = p_curso_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso % no existe', p_curso_id;
    END IF;

    IF v_estado_curso <> 'publicado' THEN
        RAISE EXCEPTION 'El curso no esta publicado (estado actual: %)', v_estado_curso
            USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (
        SELECT 1 FROM inscripciones
         WHERE estudiante_id = p_estudiante_id
           AND curso_id      = p_curso_id
    ) THEN
        RAISE EXCEPTION 'El estudiante ya esta inscrito en este curso'
            USING ERRCODE = 'unique_violation';
    END IF;

    INSERT INTO inscripciones (estudiante_id, curso_id, monto_pagado)
    VALUES (p_estudiante_id, p_curso_id, v_precio);

    UPDATE cursos      SET total_estudiantes = total_estudiantes + 1 WHERE id = p_curso_id;
    UPDATE estudiantes SET total_cursos      = total_cursos + 1      WHERE id = p_estudiante_id;
END;
$$;

-- OC-02: sp_emitir_certificado
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

-- RC-04: fn_ingresos_instructor
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

-- RC-01: vw_catalogo_cursos_publicados
CREATE OR REPLACE VIEW vw_catalogo_cursos_publicados AS
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
