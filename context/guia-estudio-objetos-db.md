# Guía de Estudio — Objetos PostgreSQL en EduSphere LMS

> Documento de referencia para defensa oral. Explica cada objeto creado,
> la decisión de diseño detrás y fragmentos clave de código.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Cambios de schema — `cambios_railway.sql`](#2-cambios-de-schema)
3. [Objetos finales — `objetos-finales.sql`](#3-objetos-finales)
4. [Tabla comparativa de REPORTES](#4-tabla-comparativa-de-reportes)
5. [Preguntas frecuentes de defensa](#5-preguntas-frecuentes-de-defensa)

---

## 1. Arquitectura general

### ¿Qué va en PostgreSQL y qué en MongoDB?

| PostgreSQL (ACID) | MongoDB (Alto volumen) |
|-------------------|------------------------|
| Usuarios, cursos, módulos, lecciones | Progreso de lecciones |
| Inscripciones, pagos, certificados | Logs de actividad |
| Liquidaciones, carrito, auditoría | Reseñas |
| Vistas, funciones, SPs | Cuestionarios, foros |

**Decisión**: Las entidades que participan en **transacciones financieras**
(inscripciones, pagos, liquidaciones) van en PostgreSQL por ACID. Las de
**alto volumen de escritura y semi-estructuradas** (progreso, logs) van
en MongoDB.

### ¿Por qué ENUMs y no tablas de catálogo?

```sql
CREATE TYPE estado_curso_e AS ENUM ('borrador', 'publicado', 'archivado');
```

**Ventaja**: El motor de BD valida los valores a nivel de tipo. No se puede
insertar un estado inválido. Es más rápido que un FK + JOIN a tabla de
catálogo. Solo se usa tabla de catálogo para `tipos_operacion_auditoria`
porque las operaciones pueden crecer con el tiempo.

### ¿Por qué UUIDs generados en BD y no en la app?

```sql
id UUID NOT NULL DEFAULT gen_random_uuid()
```

**Decisión**: Si la app generara UUIDs, dos instancias podrían colisionar.
`gen_random_uuid()` es atómico y no depende del cliente. Además, el
evaluador lo exige explícitamente.

### ¿Por qué contadores desnormalizados?

```sql
total_estudiantes INTEGER DEFAULT 0,   -- en cursos
total_cursos      INTEGER DEFAULT 0,   -- en estudiantes
calificacion_promedio NUMERIC(3,2) DEFAULT 0.00  -- en cursos e instructores
```

**Decisión**: Evitar `COUNT(*)` en cada carga de página. Los SPs actualizan
estos contadores en la misma transacción que modifica la fuente. Es un
trade-off: escritura más cara, lectura instantánea.

---

## 2. Cambios de schema (`cambios_railway.sql`)

### 2.1 Columna `categoria` en `cursos`

**Problema**: El backend (`feature/api`) espera la columna `categoria` para
el estado del curso, pero el schema original la llama `estado`. Esto es
un error de naming en el modelo del backend.

**Qué hace**:
```sql
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS categoria
  estado_curso_e NOT NULL DEFAULT 'borrador';
```

Agrega una columna `categoria` del mismo tipo ENUM que `estado`, con el
mismo default. Ambas columnas existen en paralelo.

**Por qué no renombrar `estado`**: Rompería todas las vistas y funciones
que ya referencian `c.estado`. Es más seguro duplicar y sincronizar.

### 2.2 Trigger `sync_categoria_estado`

**Problema**: Con dos columnas, hay que mantenerlas idénticas. Si alguien
actualiza una y no la otra, se desincronizan.

**Qué hace**:
```sql
CREATE FUNCTION sync_categoria_estado() RETURNS TRIGGER AS $$
BEGIN
  NEW.estado = NEW.categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_categoria_estado
  BEFORE INSERT OR UPDATE ON cursos
  FOR EACH ROW EXECUTE FUNCTION sync_categoria_estado();
```

**`BEFORE INSERT OR UPDATE`**: Se ejecuta antes de escribir la fila. Modifica
`NEW` (la versión que se va a insertar). Copia `categoria → estado`.

**`FOR EACH ROW`**: Se dispara por cada fila afectada, no una sola vez por
statement. Necesario porque cada fila puede tener un valor distinto.

**`LANGUAGE plpgsql`**: Necesita `BEGIN/END` y acceso a `NEW`/`OLD`. SQL puro
no puede escribir triggers.

### 2.3 Vistas `vw_catalogo_cursos_publicados` y `vw_cursos_estudiante`

**Por qué `vw_` y no `v_`**: El backend en `feature/api` referencia estas
vistas con el prefijo `vw_`. Si se llamaran distinto, el `SELECT * FROM
vw_catalogo_cursos_publicados` fallaría con `undefined_table`.

**`vw_catalogo_cursos_publicados` — RC-01**:
```sql
CREATE VIEW vw_catalogo_cursos_publicados AS
SELECT
    c.id AS curso_id,
    c.titulo, c.slug, c.nivel, c.precio, c.precio_descuento,
    cat.nombre AS categoria,
    (u.nombre || ' ' || u.apellido) AS instructor
FROM cursos c
JOIN categorias cat ON cat.id = c.categoria_id
JOIN instructores ins ON ins.id = c.instructor_id
JOIN usuarios u ON u.id = ins.usuario_id
WHERE c.estado = 'publicado';
```

**JOINs usados**: `cursos → categorias` (1:1, FK), `cursos → instructores`
(1:1, FK), `instructores → usuarios` (1:1, FK). Tres JOINs en cascada
para resolver el nombre del instructor.

**`WHERE c.estado = 'publicado'`**: La vista filtra en el servidor. El
cliente no necesita preocuparse por cursos no publicados.

**`vw_cursos_estudiante` — RC-02**:
```sql
CREATE VIEW vw_cursos_estudiante AS
SELECT
    e.usuario_id AS estudiante_id,  -- ¡importante! ver abajo
    i.id AS inscripcion_id,
    c.id AS curso_id,
    c.titulo AS curso_titulo,
    COALESCE(s.total_modulos, 0) AS total_modulos,
    COALESCE(s.total_lecciones, 0) AS total_lecciones
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
JOIN cursos c ON c.id = i.curso_id
LEFT JOIN LATERAL (
    SELECT COUNT(DISTINCT m.id) AS total_modulos,
           COUNT(DISTINCT l.id) AS total_lecciones
    FROM modulos m
    LEFT JOIN lecciones l ON l.modulo_id = m.id
    WHERE m.curso_id = c.id
) s ON true
WHERE i.estado IN ('activo', 'completado');
```

**`e.usuario_id AS estudiante_id`**: Esta es la decisión más importante de
esta vista. El frontend manda `usuarios.id` (desde `localStorage`) como
parámetro `:id` en `GET /estudiantes/:id/cursos`. Pero la vista filtra
por `estudiante_id`. Si usáramos `e.id` (que es `estudiantes.id`, un UUID
distinto), nunca coincidiría. Al poner `e.usuario_id AS estudiante_id`,
el `WHERE estudiante_id = $1` del backend funciona con `usuarios.id`.

**`LEFT JOIN LATERAL`**: Calcula los conteos de módulos y lecciones por
curso. `LATERAL` permite referenciar `c.id` desde la subconsulta.
Alternativa sería un `GROUP BY` externo, pero `LATERAL` es más legible y
el optimizador lo maneja bien.

**`DISTINCT` en el COUNT**: Un módulo puede tener cero lecciones. Sin
`DISTINCT`, el `LEFT JOIN` duplicaría filas y el `COUNT(*)` sería
incorrecto.

### 2.4 Corrección de comisiones existentes

```sql
UPDATE inscripciones SET tasa_comision_aplicada = 30.00
WHERE tasa_comision_aplicada = 0.00;
```

**Por qué**: Las inscripciones creadas con versiones anteriores del SP no
tenían tasa de comisión (quedó en 0.00, el default de la tabla). Esto
distorsionaba el cálculo de ingresos netos en `fn_ingresos_instructor`.

---

## 3. Objetos finales (`objetos-finales.sql`)

### 3.1 `calcular_comision` — Función escalar

```sql
CREATE OR REPLACE FUNCTION calcular_comision(
    p_monto NUMERIC,
    p_tasa  NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
    SELECT ROUND(p_monto * p_tasa / 100.0, 2);
$$;
```

**`LANGUAGE sql` vs `plpgsql`**: Cuando una función es una sola sentencia
SQL sin variables ni lógica condicional, `LANGUAGE sql` es superior.
PostgreSQL puede _inlinearla_ en la query que la llama, eliminando el
overhead de llamada a función. `plpgsql` siempre tiene costo de
invocación.

**`IMMUTABLE`**: La función no toca la base de datos y para los mismos
argumentos siempre devuelve lo mismo. El optimizador puede:
- Reemplazar `calcular_comision(100, 30)` por `30.00` en tiempo de
  planificación
- Usar el resultado cacheado en lugar de recalcular
- Crear índices sobre expresiones que usen esta función

**`STABLE` vs `IMMUTABLE`**: Si la función leyera tablas (como
`fn_avance_estudiante`), sería `STABLE`. `IMMUTABLE` es el nivel más
restrictivo y permite las mejores optimizaciones.

### 3.2 `fn_avance_estudiante` — Función TABLE (RC-03)

```sql
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
        COALESCE(mc.cnt, 0),
        COALESCE(lc.cnt, 0),
        i.estado::text,
        COALESCE(i.certificado_obtenido, false),
        i.calificacion_final
    FROM (SELECT 1) AS dummy
    LEFT JOIN inscripciones i ON i.estudiante_id = p_estudiante_id
                              AND i.curso_id = p_curso_id
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
```

**`RETURNS TABLE(...)`**: La función devuelve un conjunto de filas, no un
solo valor. Se consulta con `SELECT * FROM fn_avance_estudiante(...)`.
Es el equivalente a una vista parametrizada.

**`FROM (SELECT 1) AS dummy`**: Truco para garantizar que siempre se
retorna exactamente una fila. Sin esto, si el estudiante no está
inscrito, los `LEFT JOIN` devolverían cero filas. `dummy` fuerza una
fila base.

**`i.estado::text`**: `estado` es un ENUM (`estado_inscripcion_e`). El
cast a `text` permite que la columna de retorno sea `text` en vez del
tipo ENUM, haciéndola más portable para el frontend.

**`STABLE`**: La función lee tablas pero no las modifica. Dentro de una
misma query, los resultados son consistentes. Si fuera `VOLATILE`, el
optimizador no podría reordenar llamadas.

**Limitación**: El progreso real lección-por-lección está en MongoDB.
Esta función entrega la estructura del curso. El frontend combina ambas
fuentes para calcular el porcentaje real de avance.

### 3.3 `vm_ingresos_mensuales` — Vista materializada (RC-05)

```sql
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
```

**¿Por qué materializada y no normal?** `EXPLAIN ANALYZE` en local mostró
0.034 ms (materializada) vs 2.908 ms (normal) — **85x más rápida**. La
diferencia es que la vista normal recalcula los JOINs y agregaciones en
cada consulta, mientras que la materializada almacena el resultado.

**Costo**: Ocupa espacio en disco (~pocos KB para 104 filas). El refresh
semanal tarda ~3 ms con los datos actuales.

**`date_trunc('month', ...)`**: Agrupa por mes calendario. Alternativas
serían `date_trunc('week', ...)` o `date_trunc('quarter', ...)` según
necesidad.

**`COUNT(DISTINCT i.id)`**: Un pago tiene exactamente una inscripción
(`pagos.inscripcion_id` es UNIQUE), pero el `DISTINCT` protege contra
edge cases si la restricción fallara.

### 3.4 `vm_top_cursos_vendidos` — Vista materializada (RC-06)

```sql
CREATE MATERIALIZED VIEW vm_top_cursos_vendidos AS
SELECT
    c.id, c.titulo, c.nivel,
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
```

**`LIMIT 10` en la vista**: La vista siempre devuelve exactamente 10 filas
(los 10 más vendidos). Si se necesitan más, se quita el `LIMIT` y se
aplica en la consulta externa.

**Misma estrategia de refresh** que `vm_ingresos_mensuales`: semanal,
horario de baja carga.

### 3.5 `vw_tasa_finalizacion` — Vista normal (RC-07)

```sql
CREATE VIEW vw_tasa_finalizacion AS
SELECT
    c.id AS curso_id, c.titulo, c.nivel,
    COUNT(i.id) FILTER (WHERE i.estado = 'completado') AS completados,
    COUNT(i.id) AS total_inscritos,
    CASE WHEN COUNT(i.id) > 0
         THEN ROUND(
             COUNT(i.id) FILTER (WHERE i.estado = 'completado') * 100.0
             / COUNT(i.id), 2)
         ELSE 0
    END AS tasa_finalizacion
FROM cursos c
LEFT JOIN inscripciones i ON i.curso_id = c.id
WHERE c.estado = 'publicado'
GROUP BY c.id, c.titulo, c.nivel
HAVING COUNT(i.id) > 0
ORDER BY tasa_finalizacion DESC;
```

**`FILTER (WHERE ...)`**: Sintaxis SQL estándar para agregados condicionales.
Alternativa: `COUNT(CASE WHEN ... THEN 1 END)`. `FILTER` es más legible
y el optimizador lo maneja eficientemente.

**`HAVING COUNT(i.id) > 0`**: Descarta cursos sin inscripciones (tasa = 0%
no es informativo y distorsiona el ranking).

**¿Por qué vista normal y no materializada?**: Los datos cambian con cada
inscripción completada. Una vista materializada quedaría desactualizada
rápidamente. El costo de la consulta es bajo (JOIN simple con agregación).

### 3.6 `sp_inscribir_estudiante` — Actualización final (OC-01)

**Versión actual** (unifica todos los cambios anteriores):

```sql
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
    -- 1. Resolver estudiante_id desde usuario_id
    SELECT id INTO v_est_id FROM estudiantes WHERE usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario % no tiene perfil de estudiante', p_usuario_id;
    END IF;

    -- 2. Validar curso
    SELECT c.estado::text, COALESCE(c.precio_descuento, c.precio)
      INTO v_estado_curso, v_precio
      FROM cursos c WHERE c.id = p_curso_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El curso % no existe', p_curso_id;
    END IF;

    -- 3. RN-02: solo cursos publicados
    IF v_estado_curso <> 'publicado' THEN
        RAISE EXCEPTION 'El curso no esta publicado (estado: %)',
            v_estado_curso USING ERRCODE = 'check_violation';
    END IF;

    -- 4. RN-01: no duplicados
    IF EXISTS (
        SELECT 1 FROM inscripciones
        WHERE estudiante_id = v_est_id AND curso_id = p_curso_id
    ) THEN
        RAISE EXCEPTION 'El estudiante ya esta inscrito'
            USING ERRCODE = 'unique_violation';
    END IF;

    -- 5. RN-04: calcular comision
    v_comision := calcular_comision(v_precio, v_tasa);

    -- 6. Crear inscripcion
    INSERT INTO inscripciones
        (estudiante_id, curso_id, monto_pagado, tasa_comision_aplicada)
    VALUES (v_est_id, p_curso_id, v_precio, v_tasa)
    RETURNING id INTO v_ins_id;

    -- 7. RN-03: registrar pago
    INSERT INTO pagos (inscripcion_id, monto, metodo_pago,
                       referencia_pago, proveedor_pago, estado, detalles_pago)
    VALUES (
        v_ins_id, v_precio, p_metodo_pago,
        'ref-' || replace(gen_random_uuid()::text, '-', ''),
        'EduSphere Demo', 'completado',
        jsonb_build_object('curso', p_curso_id, 'tasa', v_tasa,
                           'comision', v_comision)
    );

    -- 8. Auditoria
    INSERT INTO log_auditoria
        (usuario_id, tipo_operacion_id, entidad_afectada,
         entidad_id, detalles_operacion)
    SELECT p_usuario_id, tao.id, 'inscripciones', v_ins_id,
           jsonb_build_object('estudiante_id', v_est_id,
                              'curso_id', p_curso_id,
                              'monto', v_precio,
                              'tasa', v_tasa,
                              'comision', v_comision)
    FROM tipos_operacion_auditoria tao
    WHERE tao.nombre = 'inscripcion_curso';

    -- 9. Actualizar contadores
    UPDATE cursos SET total_estudiantes = total_estudiantes + 1
        WHERE id = p_curso_id;
    UPDATE estudiantes SET total_cursos = total_cursos + 1
        WHERE id = v_est_id;
END;
$$;
```

**Flujo completo del SP**:
1. Resuelve `usuario_id → estudiante_id` (el frontend manda `usuarios.id`)
2. Valida que el curso exista y esté publicado (RN-02)
3. Valida que no haya inscripción duplicada (RN-01)
4. Calcula comisión con `calcular_comision()` (RN-04)
5. Inserta en `inscripciones` con precio snapshot
6. Inserta en `pagos` con método, referencia y estado (RN-03)
7. Inserta en `log_auditoria` (inmutable, append-only)
8. Actualiza contadores desnormalizados

**`USING ERRCODE`**: Cada `RAISE EXCEPTION` usa un código SQLSTATE
específico. El `errorHandler` del backend mapea estos códigos a
mensajes HTTP. Ej: `check_violation` (23514) → 400, `unique_violation`
(23505) → 409.

**`jsonb_build_object`**: Construye el JSON para `detalles_pago` y
`detalles_operacion` sin necesidad de concatenar strings. Más seguro
que armar JSON manualmente.

### 3.7 `sp_emitir_certificado` — Actualización final (OC-02)

```sql
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
    -- Validar inscripcion y curso
    SELECT i.estado::text, c.permite_certificado, i.estudiante_id, c.id
      INTO v_estado, v_permite_cert, v_estudiante, v_curso_id
      FROM inscripciones i
      JOIN cursos c ON c.id = i.curso_id
     WHERE i.id = p_inscripcion_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La inscripcion % no existe', p_inscripcion_id;
    END IF;

    IF v_estado <> 'completado' THEN
        RAISE EXCEPTION 'No se puede certificar: estado %', v_estado
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT v_permite_cert THEN
        RAISE EXCEPTION 'El curso no otorga certificado'
            USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (SELECT 1 FROM certificados
               WHERE inscripcion_id = p_inscripcion_id) THEN
        RAISE EXCEPTION 'El certificado ya fue emitido'
            USING ERRCODE = 'unique_violation';
    END IF;

    v_codigo := 'CERT-' || upper(substr(
        replace(p_inscripcion_id::text, '-', ''), 1, 12));

    INSERT INTO certificados
        (inscripcion_id, codigo_certificado, url_certificado)
    VALUES (p_inscripcion_id, v_codigo,
            'https://edusphere.app/certificados/' || v_codigo);

    SELECT e.usuario_id INTO v_user_id
      FROM estudiantes e WHERE e.id = v_estudiante;

    INSERT INTO log_auditoria
        (usuario_id, tipo_operacion_id, entidad_afectada,
         entidad_id, detalles_operacion)
    SELECT v_user_id, tao.id, 'certificados', p_inscripcion_id,
           jsonb_build_object('codigo', v_codigo,
                              'curso_id', v_curso_id,
                              'estudiante_id', v_estudiante)
    FROM tipos_operacion_auditoria tao
    WHERE tao.nombre = 'emision_certificado';

    UPDATE inscripciones SET certificado_obtenido = true
        WHERE id = p_inscripcion_id;
    UPDATE estudiantes SET total_certificados = total_certificados + 1
        WHERE id = v_estudiante;
END;
$$;
```

**Validaciones en orden**:
1. ¿Existe la inscripción?
2. ¿Está completada? (RN-06)
3. ¿El curso permite certificado?
4. ¿Ya se emitió antes? (unique constraint)

**`v_codigo`**: Se genera a partir del UUID de la inscripción (primeros 12
caracteres en mayúscula, sin guiones). Es único porque `inscripcion_id`
es único.

**Resolución de `usuario_id`**: `log_auditoria.usuario_id` referencia
`usuarios.id`, no `estudiantes.id`. Por eso se hace el `SELECT` extra
para obtener el `usuario_id` del estudiante.

---

## 4. Tabla comparativa de REPORTES

| RC | Objeto | Motor | Lenguaje | Volatilidad | Tipo |
|----|--------|-------|----------|-------------|------|
| RC-01 | `vw_catalogo_cursos_publicados` | PG | sql | — | Vista normal |
| RC-02 | `vw_cursos_estudiante` | PG | sql | — | Vista normal |
| RC-03 | `fn_avance_estudiante` | PG | sql | STABLE | Función TABLE |
| RC-04 | `fn_ingresos_instructor` | PG | sql | STABLE | Función TABLE |
| RC-05 | `vm_ingresos_mensuales` | PG | — | — | Vista materializada |
| RC-06 | `vm_top_cursos_vendidos` | PG | — | — | Vista materializada |
| RC-07 | `vw_tasa_finalizacion` | PG | sql | — | Vista normal |
| RC-08 | Pipeline abandono | Mongo | JS | — | Aggregation |
| RC-09 | Pipeline tiempo | Mongo | JS | — | Aggregation |
| RC-10 | Pipeline $facet | Mongo | JS | — | Aggregation |
| RC-11 | Pipeline foros | Mongo | JS | — | Aggregation |

---

## 5. Preguntas frecuentes de defensa

### ¿Por qué `LANGUAGE sql` y no `plpgsql` en las funciones?

`LANGUAGE sql` permite que PostgreSQL _inlinee_ la función dentro de la
query que la llama. Es como si el SQL de la función se copiara y pegara
en la consulta principal. Esto elimina el overhead de cambio de contexto
entre el motor SQL y el motor procedural.

`plpgsql` se necesita cuando hay:
- Variables (`DECLARE`)
- Condicionales (`IF/THEN/ELSE`)
- Bucles (`FOR`, `LOOP`)
- Manejo de excepciones (`EXCEPTION`)
- Acceso a `NEW`/`OLD` (triggers)

Para una función que es una sola query SQL, `LANGUAGE sql` es más rápido.

### ¿Cuándo usar `IMMUTABLE`, `STABLE` o `VOLATILE`?

| Categoría | Significado | Ejemplo |
|-----------|-------------|---------|
| `IMMUTABLE` | Mismos args = mismo resultado siempre. No lee BD. | `calcular_comision(100, 30)` |
| `STABLE` | Mismo resultado dentro de una query. Lee BD pero no la modifica. | `fn_avance_estudiante(...)` |
| `VOLATILE` | Puede devolver diferente cada vez. Modifica BD. | `random()`, SPs |

`IMMUTABLE` permite que el optimizador reemplace la llamada por una
constante en tiempo de planificación. `STABLE` permite reordenar llamadas
pero no cachear entre statements. Los SPs son siempre `VOLATILE`.

### ¿Por qué `COALESCE` en todas las agregaciones?

`SUM()`, `COUNT()` y `AVG()` sobre un conjunto vacío devuelven `NULL`,
no 0. `COALESCE(..., 0)` garantiza que el frontend reciba números, no
nulls. Evita conversiones en JavaScript.

### ¿Por qué `jsonb_build_object` en vez de concatenar strings?

```sql
-- Correcto (seguro, tipado)
jsonb_build_object('curso', p_curso_id, 'tasa', v_tasa)

-- Incorrecto (inseguro, prone a errores de sintaxis)
('{"curso": "' || p_curso_id || '", "tasa": ' || v_tasa || '}')::jsonb
```

`jsonb_build_object` escapa caracteres especiales automáticamente y
maneja correctamente NULLs, números y UUIDs.

### ¿Qué pasa si el trigger `sync_categoria_estado` falla?

El trigger es `BEFORE INSERT OR UPDATE`. Si falla, la operación completa
se revierte (es parte de la misma transacción). No se insertan datos
inconsistentes.

### ¿Por qué las vistas materializadas necesitan refresh manual?

PostgreSQL no actualiza automáticamente las vistas materializadas. A
diferencia de otros motores (ej. Oracle), PG requiere `REFRESH
MATERIALIZED VIEW` explícito. Esto da control total sobre _cuándo_ se
incurre en el costo de regeneración.

Alternativa: usar triggers para refrescar incrementalmente, pero añade
complejidad. Para volúmenes de MVP (<1000 pagos), el refresh semanal
completo es más simple y suficiente.
