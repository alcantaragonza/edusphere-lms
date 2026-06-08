-- ==================================================================
-- EduSphere LMS — CAMBIOS APLICADOS EN RAILWAY
-- ==================================================================
-- Archivo ejecutable que contiene TODOS los cambios de schema aplicados
-- directamente sobre la base de datos PostgreSQL en Railway durante la
-- sesion del 2026-06-08.
--
-- ORDEN DE EJECUCION: secuencial (cada objeto puede depender del anterior).
-- Los DROP previos garantizan que el script sea re-ejecutable sin errores.
-- ==================================================================

-- ==================================================================
-- 1. COLUMNA `categoria` EN LA TABLA `cursos`
-- ==================================================================
-- PROBLEMA: El backend (src/models/cursos.model.js en feature/api) espera
-- que la columna de estado del curso se llame `categoria`, pero nuestro
-- schema original la nombro `estado`. Esto es un error de naming en el
-- modelo del backend que data de una version anterior del schema.
--
-- SOLUCION: Agregamos una columna `categoria` del mismo tipo ENUM y con
-- el mismo valor por defecto que `estado`. Ambas columnas coexisten y
-- se mantienen sincronizadas via trigger.
--
-- POR QUE NO RENOMBRAR `estado`?
--   Romperia todas las vistas (vw_catalogo_cursos_publicados,
--   vw_cursos_estudiante) y funciones (fn_ingresos_instructor,
--   fn_avance_estudiante) que referencian c.estado. Es mas seguro
--   duplicar la columna y mantener ambas sincronizadas que renombrar.
--
-- `ADD COLUMN IF NOT EXISTS`: evita error si el script se re-ejecuta.
-- `estado_curso_e`: mismo tipo ENUM que `estado` (valores: borrador,
--   publicado, archivado).
-- `NOT NULL DEFAULT 'borrador'`: coincide con el default de `estado`.
-- ==================================================================
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS categoria estado_curso_e NOT NULL DEFAULT 'borrador';

-- Sincronizacion inicial: copia los valores existentes de `estado` a
-- `categoria`. Esto garantiza que los cursos creados antes de este cambio
-- tengan ambas columnas con el mismo valor.
UPDATE cursos SET categoria = estado;

-- ==================================================================
-- 2. TRIGGER `sync_categoria_estado`
-- ==================================================================
-- PROPOSITO: Mantener `categoria` y `estado` identicas en todo momento.
-- Cada vez que se INSERTA o ACTUALIZA un curso, el trigger copia
-- automaticamente el valor de `categoria` hacia `estado`.
--
-- `BEFORE INSERT OR UPDATE`: se ejecuta ANTES de que la fila se escriba
--   en disco. Esto permite modificar NEW (la version que se va a insertar)
--   antes de que PostgreSQL la persista.
--
-- `FOR EACH ROW`: el trigger se dispara por cada fila afectada, no una
--   sola vez por statement. Necesario porque cada fila puede tener un
--   valor distinto de `categoria`.
--
-- `NEW.estado = NEW.categoria`: copia el valor. NEW es un record especial
--   de PL/pgSQL que contiene la version modificada de la fila.
--
-- `RETURNS TRIGGER`: obligatorio para funciones que se usan como triggers.
--   La funcion DEBE retornar NEW (o NULL para cancelar la operacion).
--
-- `LANGUAGE plpgsql`: necesario porque SQL puro no puede acceder a
--   NEW/OLD ni ejecutar logica condicional.
-- ==================================================================
CREATE OR REPLACE FUNCTION sync_categoria_estado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.estado = NEW.categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- `DROP TRIGGER IF EXISTS`: permite re-ejecutar el script sin errores.
DROP TRIGGER IF EXISTS trg_sync_categoria_estado ON cursos;

-- `CREATE TRIGGER`: asocia la funcion a la tabla `cursos`.
-- `EXECUTE FUNCTION sync_categoria_estado()`: sintaxis PostgreSQL 11+.
--   En versiones anteriores se usaba `EXECUTE PROCEDURE`.
CREATE TRIGGER trg_sync_categoria_estado
  BEFORE INSERT OR UPDATE ON cursos
  FOR EACH ROW
  EXECUTE FUNCTION sync_categoria_estado();

-- ==================================================================
-- 3. SP: sp_inscribir_estudiante (OC-01)
-- ==================================================================
-- PROPOSITO: Operacion critica OC-01 del enunciado. Inscribe a un
-- estudiante en un curso publicado, crea el registro de pago y
-- actualiza los contadores desnormalizados. Todo en una transaccion.
--
-- PARAMETROS:
--   p_usuario_id  = UUID del usuario (usuarios.id). El frontend envia
--                   este valor desde localStorage (edusphere_user_id).
--   p_curso_id    = UUID del curso a inscribir.
--   p_metodo_pago = ENUM metodo_pago_e. DEFAULT 'tarjeta' porque el
--                   backend llama al SP con solo 2 parametros.
--
-- VALIDACIONES (en orden de ejecucion):
--   1. El usuario debe tener un perfil de estudiante (estudiantes.usuario_id)
--   2. El curso debe existir
--   3. El curso debe estar publicado (RN-02 del enunciado)
--   4. No debe existir una inscripcion duplicada (RN-01)
--
-- REGLAS DE NEGOCIO IMPLEMENTADAS:
--   RN-01: Evitar inscripcion duplicada (unique_violation)
--   RN-02: Solo cursos publicados (check_violation)
--   RN-03: Registrar pago con monto snapshot del precio vigente
--   RN-04: Calcular comision de plataforma (30%)
--
-- POR QUE RECIBE `usuario_id` Y NO `estudiante_id`?
--   El frontend almacena `edusphere_user_id` (usuarios.id) en localStorage
--   despues del login. El endpoint POST /inscripciones envia ese valor
--   como `estudiante_id`. Para no modificar el frontend, el SP resuelve
--   internamente: busca el estudiantes.id correspondiente al usuario_id.
--   Esta decision evita una llamada extra a la API de estudiantes.
--
-- USO DE `USING ERRCODE`:
--   Cada RAISE EXCEPTION especifica un codigo SQLSTATE. El errorHandler
--   del backend (src/middlewares/errorHandler.js) mapea estos codigos a
--   respuestas HTTP:
--     check_violation  (23514) -> 400 Bad Request
--     unique_violation (23505) -> 409 Conflict
--   Esto permite que el frontend muestre mensajes de error especificos
--   en lugar de un generico "error interno".
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
    v_est_id        uuid;             -- estudiantes.id resuelto desde usuario_id
    v_ins_id        uuid;             -- inscripciones.id generado por RETURNING
    v_estado_curso  text;             -- estado del curso (publicado/borrador/archivado)
    v_precio        numeric(10,2);    -- precio efectivo (con descuento si aplica)
    v_tasa          numeric(5,2) := 30.00; -- comision de plataforma fija
BEGIN
    -- Resolver estudiantes.id desde usuarios.id
    SELECT id INTO v_est_id FROM estudiantes WHERE usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario % no tiene perfil de estudiante', p_usuario_id;
    END IF;

    -- Obtener estado y precio del curso. COALESCE con precio_descuento
    -- primero porque si hay descuento, ese es el precio que paga el estudiante.
    SELECT c.estado::text, COALESCE(c.precio_descuento, c.precio)
      INTO v_estado_curso, v_precio
      FROM cursos c
     WHERE c.id = p_curso_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso % no existe', p_curso_id;
    END IF;

    -- RN-02: solo cursos publicados pueden recibir inscripciones
    IF v_estado_curso <> 'publicado' THEN
        RAISE EXCEPTION 'El curso no esta publicado (estado: %)', v_estado_curso
            USING ERRCODE = 'check_violation';
    END IF;

    -- RN-01: no permitir doble inscripcion al mismo curso
    IF EXISTS (
        SELECT 1 FROM inscripciones
         WHERE estudiante_id = v_est_id
           AND curso_id      = p_curso_id
    ) THEN
        RAISE EXCEPTION 'El estudiante ya esta inscrito en este curso'
            USING ERRCODE = 'unique_violation';
    END IF;

    -- Crear la inscripcion. monto_pagado = precio en el momento de la compra
    -- (snapshot inmutable). tasa_comision_aplicada = 30% fijo.
    -- RETURNING id INTO v_ins_id captura el UUID generado para usarlo en el pago.
    INSERT INTO inscripciones (estudiante_id, curso_id, monto_pagado, tasa_comision_aplicada)
    VALUES (v_est_id, p_curso_id, v_precio, v_tasa)
    RETURNING id INTO v_ins_id;

    -- RN-03: registrar el pago. La referencia es un string aleatorio basado
    -- en gen_random_uuid() para simular un ID de transaccion externa.
    -- jsonb_build_object construye JSON de forma segura (escapa caracteres).
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

    -- Actualizar contadores desnormalizados.
    -- Por que desnormalizar? Evita COUNT(*) en cada carga de pagina.
    -- El costo se paga una vez (al insertar) y se ahorra en cada lectura.
    UPDATE cursos      SET total_estudiantes = total_estudiantes + 1 WHERE id = p_curso_id;
    UPDATE estudiantes SET total_cursos      = total_cursos + 1      WHERE id = v_est_id;
END;
$$;

-- ==================================================================
-- 4. SP: sp_emitir_certificado (OC-02)
-- ==================================================================
-- PROPOSITO: Operacion critica OC-02. Emite un certificado de finalizacion
-- para una inscripcion completada. Un certificado solo se emite UNA vez
-- por inscripcion.
--
-- VALIDACIONES:
--   1. La inscripcion debe existir
--   2. La inscripcion debe estar en estado 'completado'
--   3. El curso debe tener permite_certificado = true
--   4. No debe existir un certificado previo para esta inscripcion
--
-- CODIGO DEL CERTIFICADO:
--   Se genera a partir del UUID de la inscripcion (primeros 12 caracteres
--   hexadecimales en mayuscula). Como inscripcion_id es UNIQUE, el codigo
--   resultante tambien lo es. No se usa gen_random_uuid() porque queremos
--   un codigo deterministico y legible.
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
BEGIN
    -- JOIN con cursos para obtener permite_certificado y estudiante_id
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

    -- Generar codigo: ej. CERT-A1B2C3D4E5F6
    v_codigo := 'CERT-' || upper(substr(replace(p_inscripcion_id::text, '-', ''), 1, 12));

    INSERT INTO certificados (inscripcion_id, codigo_certificado, url_certificado)
    VALUES (
        p_inscripcion_id,
        v_codigo,
        'https://edusphere.app/certificados/' || v_codigo
    );

    -- Actualizar estado de la inscripcion y contador del estudiante
    UPDATE inscripciones SET certificado_obtenido = true                 WHERE id = p_inscripcion_id;
    UPDATE estudiantes   SET total_certificados   = total_certificados + 1 WHERE id = v_estudiante;
END;
$$;

-- ==================================================================
-- 5. FUNCION: fn_ingresos_instructor (RC-04)
-- ==================================================================
-- PROPOSITO: Reporte RC-04. Calcula los ingresos brutos y netos de un
-- instructor en un rango de fechas, desglosados por curso.
--
-- RETURNS TABLE: la funcion devuelve un conjunto de filas (no un solo
--   valor). Se consulta con SELECT * FROM fn_ingresos_instructor(...).
--   Es el equivalente a una vista parametrizada.
--
-- LANGUAGE sql: es una sola query SQL sin logica procedural. PostgreSQL
--   puede inlinearla en la consulta que la llama, eliminando el overhead
--   de cambio de contexto PL/pgSQL.
--
-- STABLE: la funcion lee tablas pero no las modifica. Dentro de una misma
--   query, los resultados son consistentes. Esto permite que el
--   optimizador reordene llamadas.
--
-- FORMULA DEL INGRESO NETO:
--   monto_pagado * (1 - tasa_comision_aplicada / 100)
--   Ejemplo: Q100 con tasa 30% -> Q100 * (1 - 0.30) = Q70 neto.
--
-- COALESCE(SUM(...), 0): si un curso no tiene inscripciones en el rango,
--   SUM() devuelve NULL. COALESCE lo convierte a 0 para que el frontend
--   reciba numeros, no nulls.
-- ==================================================================
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

-- ==================================================================
-- 6. VISTA: vw_catalogo_cursos_publicados (RC-01)
-- ==================================================================
-- PROPOSITO: Catalogo publico de cursos. Solo muestra cursos en estado
-- 'publicado' con la informacion relevante para el estudiante.
--
-- `vw_` PREFIJO: el backend en src/models/reportes.model.js referencia
--   esta vista como 'vw_catalogo_cursos_publicados'. Si usaramos un
--   nombre distinto, el SELECT fallaria con undefined_table (501).
--
-- JOINS:
--   cursos -> categorias (1:1 via categoria_id FK)
--   cursos -> instructores (1:1 via instructor_id FK)
--   instructores -> usuarios (1:1 via usuario_id FK)
--   Tres JOINs en cascada para resolver el nombre del instructor.
--
-- `cat.nombre AS categoria`: alias para que el frontend reciba 'categoria'
--   en vez de 'nombre'.
--
-- `||` para concatenar nombre y apellido: en PostgreSQL, `||` es el
--   operador de concatenacion de strings (equivalente a `+` en JS).
-- ==================================================================
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

-- ==================================================================
-- 7. VISTA: vw_cursos_estudiante (RC-02)
-- ==================================================================
-- PROPOSITO: Cursos en los que un estudiante esta inscrito, con conteo
-- de modulos y lecciones. El backend filtra por estudiante_id via WHERE.
--
-- `e.usuario_id AS estudiante_id` (DECISION CLAVE):
--   El frontend envia usuarios.id (desde localStorage) como parametro :id
--   en GET /estudiantes/:id/cursos. Pero la vista filtraria por
--   estudiantes.id, que es un UUID DIFERENTE. Al poner e.usuario_id como
--   alias de estudiante_id, el WHERE estudiante_id = $1 del backend
--   funciona con usuarios.id.
--
-- LATERAL:
--   Las subconsultas `mc` y `lc` usan LATERAL para poder referenciar
--   c.id desde dentro de la subconsulta. Sin LATERAL, PostgreSQL no
--   permitiria la correlacion.
--
-- COUNT(DISTINCT):
--   Un modulo puede tener cero lecciones. El LEFT JOIN entre modulos y
--   lecciones puede generar filas duplicadas. COUNT(DISTINCT) evita
--   conteos inflados.
--
-- COALESCE(..., 0):
--   Si un curso no tiene modulos/lecciones, la subconsulta LATERAL
--   devuelve NULL. COALESCE lo convierte a 0.
-- ==================================================================
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

-- ==================================================================
-- 8. CORRECCION DE DATOS EXISTENTES
-- ==================================================================
-- Las inscripciones creadas con versiones anteriores del SP no tenian
-- tasa de comision (quedaron con el default 0.00 de la tabla). Esto
-- distorsionaba el calculo de ingresos netos. Actualizamos todas las
-- inscripciones existentes a la tasa estandar del 30%.
-- ==================================================================
UPDATE inscripciones SET tasa_comision_aplicada = 30.00 WHERE tasa_comision_aplicada = 0.00;
