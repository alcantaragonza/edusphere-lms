-- ============================================================================
-- EduSphere LMS — Estructura PostgreSQL SIN ÍNDICES
-- ============================================================================
-- Fase 1 del plan de trabajo: versión base para medir rendimiento sin índices.
--
-- PROPÓSITO:
--   Este archivo contiene las mismas 16 tablas, ENUMs, constraints, FKs y
--   CHECKs que `estructura_db.sql`, pero SIN los 27 índices. Sirve como línea
--   base para el reporte de performance (sección 5.5 del enunciado):
--
--   1. Aplicar este archivo en una BD limpia.
--   2. Cargar seed data con los volúmenes mínimos.
--   3. Ejecutar EXPLAIN ANALYZE en 2-3 queries representativos.
--   4. Aplicar los índices (`estructura_db.sql`) y repetir los mismos queries.
--   5. Comparar tiempos y planes de ejecución → material para el reporte.
--
-- UBICACIÓN: db/sin_indices/estructura_db_sin_indices.sql
-- DEPENDE DE: extensiones pgcrypto, pg_stat_statements
-- APLICAR CON:
--   docker exec -i ${POSTGRES_CONTAINER_NAME} psql -U ${POSTGRES_USER} \
--     -d ${POSTGRES_DB} < db/sin_indices/estructura_db_sin_indices.sql
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONES REQUERIDAS
-- ============================================================================
-- pgcrypto:         provee gen_random_uuid() para claves primarias UUID
-- pg_stat_statements: necesario para análisis de queries (EXPLAIN ANALYZE)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- 1. TIPOS ENUM — Estados de negocio y catálogos cerrados
-- ============================================================================
-- Los ENUMs se usan en lugar de tablas de catálogo porque los valores son
-- finitos, rara vez cambian y se validan a nivel de schema. La excepción es
-- tipos_operacion_auditoria, que sí es tabla porque el catálogo puede crecer.

-- Roles de usuario en la plataforma
CREATE TYPE rol_usuario          AS ENUM ('instructor', 'estudiante', 'admin');

-- Ciclo de vida de un curso (workflow editorial)
CREATE TYPE estado_curso_e       AS ENUM ('borrador', 'publicado', 'archivado');

-- Nivel de dificultad del curso
CREATE TYPE nivel_curso_e        AS ENUM ('principiante', 'intermedio', 'avanzado');

-- Tipo de contenido de una lección
CREATE TYPE tipo_leccion_e       AS ENUM ('video', 'lectura', 'cuestionario', 'descarga');

-- Estado de la relación estudiante-curso
CREATE TYPE estado_inscripcion_e AS ENUM ('activa', 'completada', 'reembolsada', 'suspendida');

-- Ciclo de vida de una liquidación a instructor
CREATE TYPE estado_liquidacion_e AS ENUM ('pendiente', 'en_revision', 'pagada', 'cancelada');

-- Métodos de pago aceptados por la plataforma
CREATE TYPE metodo_pago_e        AS ENUM ('tarjeta_credito', 'tarjeta_debito', 'paypal', 'transferencia', 'efectivo');

-- Resultado de una transacción de pago
CREATE TYPE estado_pago_e        AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');


-- ============================================================================
-- 2. CONFIGURACIÓN DE PLATAFORMA
-- ============================================================================
-- Tabla clave-valor para parámetros globales: tasa de comisión, moneda
-- default, límites, etc. Cada fila tiene vigencia desde una fecha.
-- modificado_por referencia al admin que hizo el cambio.

CREATE TABLE configuracion_plataforma (
    id               SMALLSERIAL   NOT NULL,
    clave            VARCHAR(80)   NOT NULL,
    valor            VARCHAR(255)  NOT NULL,
    descripcion      TEXT,
    vigente_desde    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    modificado_por   UUID,                          -- FK a usuarios(id), se define después
    PRIMARY KEY (id),
    UNIQUE (clave)                                  -- no puede haber dos filas con la misma clave
);


-- ============================================================================
-- 3. USUARIOS — Entidad base para todos los actores
-- ============================================================================
-- Tabla compartida por instructores, estudiantes y admins. El campo `rol`
-- determina el perfil. Las tablas `instructores` y `estudiantes` extienden
-- esta tabla con datos específicos de cada rol (relación 1:1).

CREATE TABLE usuarios (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    nombre             VARCHAR(120)  NOT NULL,
    apellido           VARCHAR(120),
    email              VARCHAR(254)  NOT NULL,
    password_hash      VARCHAR(255)  NOT NULL,
    telefono           VARCHAR(20),
    foto_perfil_url    VARCHAR(500),
    rol                rol_usuario   NOT NULL,
    activo             BOOLEAN       NOT NULL DEFAULT TRUE,
    email_verificado   BOOLEAN       NOT NULL DEFAULT FALSE,
    fecha_verificacion TIMESTAMPTZ,
    ultimo_acceso      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (email),                              -- un email = un usuario
    CONSTRAINT chk_usuarios_email
        CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_usuarios_telefono
        CHECK (telefono IS NULL OR telefono ~ '^\+?[0-9]{8,20}$')
);

-- FK pendiente de configuracion_plataforma → usuarios
ALTER TABLE configuracion_plataforma
    ADD CONSTRAINT fk_config_modificado_por
    FOREIGN KEY (modificado_por) REFERENCES usuarios(id)
    ON DELETE SET NULL;                          -- si se borra el admin, no se pierde la config


-- ============================================================================
-- 4. INSTRUCTORES — Extensión 1:1 de usuarios con perfil profesional
-- ============================================================================
-- Campos de liquidación (metodo_pago, referencia_pago) para que la plataforma
-- sepa cómo pagarle. Contadores denormalizados (total_estudiantes, total_cursos,
-- calificacion_promedio) que se actualizan vía stored procedures.

CREATE TABLE instructores (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    usuario_id         UUID          NOT NULL,
    biografia          TEXT,
    titulo_profesional VARCHAR(200),
    anos_experiencia   SMALLINT,
    sitio_web          VARCHAR(500),
    linkedin_url       VARCHAR(500),
    twitter_url        VARCHAR(500),
    metodo_pago        VARCHAR(60),               -- ej: "transferencia_bancaria"
    referencia_pago    VARCHAR(255),              -- ej: CBU / CLABE
    calificacion_promedio NUMERIC(3,2) DEFAULT 0.00,  -- 0.00 a 5.00, actualizado por trigger/SP
    total_estudiantes  INTEGER       DEFAULT 0,   -- contador denormalizado
    total_cursos       INTEGER       DEFAULT 0,   -- contador denormalizado
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (usuario_id),                         -- un usuario solo puede ser un instructor
    CONSTRAINT fk_instructor_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE,                       -- si se borra el usuario, se borra el instructor
    CONSTRAINT chk_instructor_experiencia
        CHECK (anos_experiencia IS NULL OR anos_experiencia >= 0),
    CONSTRAINT chk_instructor_calificacion
        CHECK (calificacion_promedio BETWEEN 0 AND 5)
);


-- ============================================================================
-- 5. ESTUDIANTES — Extensión 1:1 de usuarios con perfil de aprendizaje
-- ============================================================================
-- Datos demográficos opcionales. Contadores denormalizados para evitar JOINs
-- en consultas frecuentes del perfil del estudiante.

CREATE TABLE estudiantes (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    usuario_id          UUID          NOT NULL,
    pais                CHAR(2),                   -- código ISO 3166-1 alpha-2
    ciudad              VARCHAR(100),
    fecha_nacimiento    DATE,
    ocupacion           VARCHAR(100),
    nivel_educativo     VARCHAR(50),
    intereses           TEXT,                      -- texto libre con intereses/temas
    total_cursos        INTEGER       DEFAULT 0,   -- contador denormalizado
    total_certificados  INTEGER       DEFAULT 0,   -- contador denormalizado
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (usuario_id),                          -- un usuario solo puede ser un estudiante
    CONSTRAINT fk_estudiante_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_estudiante_pais
        CHECK (pais IS NULL OR pais ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_estudiante_fecha_nac
        CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento < CURRENT_DATE)
);


-- ============================================================================
-- 6. CATEGORÍAS — Clasificación de cursos
-- ============================================================================
-- SMALLSERIAL como PK porque hay pocas categorías (<100). Slug se usa para
-- URLs amigables. orden_display controla el orden en el catálogo.

CREATE TABLE categorias (
    id               SMALLSERIAL   NOT NULL,
    nombre           VARCHAR(80)   NOT NULL,
    slug             VARCHAR(100)  NOT NULL,
    descripcion      TEXT,
    icono_url        VARCHAR(500),
    color_hex        CHAR(7),                    -- ej: "#FF5733"
    activa           BOOLEAN       NOT NULL DEFAULT TRUE,
    orden_display    SMALLINT      DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (nombre),
    UNIQUE (slug),
    CONSTRAINT chk_categoria_color
        CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
);


-- ============================================================================
-- 7. CURSOS — Producto principal de la plataforma
-- ============================================================================
-- Cada curso pertenece a un instructor y una categoría. precio_descuento es
-- opcional y debe ser menor al precio base (CHECK). Contadores denormalizados
-- para evitar agregaciones costosas en consultas de catálogo.

CREATE TABLE cursos (
    id                    UUID           NOT NULL DEFAULT gen_random_uuid(),
    instructor_id         UUID           NOT NULL,
    categoria_id          SMALLINT       NOT NULL,
    nivel                 nivel_curso_e  NOT NULL,
    estado                estado_curso_e NOT NULL DEFAULT 'borrador',
    titulo                VARCHAR(200)   NOT NULL,
    slug                  VARCHAR(250)   NOT NULL,
    subtitulo             VARCHAR(300),
    descripcion           TEXT,
    descripcion_corta     VARCHAR(500),
    objetivos             TEXT,
    requisitos_previos    TEXT,
    idioma                CHAR(2)        NOT NULL DEFAULT 'es',       -- ISO 639-1
    subtitulos_disponibles TEXT[],                                    -- array de códigos de idioma
    imagen_portada_url    VARCHAR(500),
    video_preview_url     VARCHAR(500),
    precio                NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    precio_descuento      NUMERIC(10,2),
    moneda                CHAR(3)        NOT NULL DEFAULT 'USD',      -- ISO 4217
    duracion_total_min    INTEGER        NOT NULL DEFAULT 0,
    total_modulos         SMALLINT       DEFAULT 0,    -- contador denormalizado
    total_lecciones       SMALLINT       DEFAULT 0,    -- contador denormalizado
    calificacion_promedio NUMERIC(3,2)   DEFAULT 0.00, -- desde MongoDB resenas
    total_resenas         INTEGER        DEFAULT 0,    -- contador denormalizado
    total_estudiantes     INTEGER        DEFAULT 0,    -- contador denormalizado
    permite_certificado   BOOLEAN        NOT NULL DEFAULT TRUE,
    fecha_publicacion     TIMESTAMPTZ,
    fecha_ultima_actualizacion TIMESTAMPTZ,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (slug),
    CONSTRAINT fk_cursos_instructor
        FOREIGN KEY (instructor_id) REFERENCES instructores(id),
    CONSTRAINT fk_cursos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    CONSTRAINT chk_cursos_precio
        CHECK (precio >= 0),
    CONSTRAINT chk_cursos_precio_descuento
        CHECK (precio_descuento IS NULL OR (precio_descuento >= 0 AND precio_descuento < precio)),
    CONSTRAINT chk_cursos_duracion
        CHECK (duracion_total_min >= 0),
    CONSTRAINT chk_cursos_idioma
        CHECK (idioma ~ '^[a-z]{2}$'),
    CONSTRAINT chk_cursos_moneda
        CHECK (moneda ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_cursos_calificacion
        CHECK (calificacion_promedio BETWEEN 0 AND 5)
);


-- ============================================================================
-- 8. MÓDULOS — Agrupación de lecciones dentro de un curso
-- ============================================================================
-- orden es único por curso (UNIQUE curso_id, orden). ON DELETE CASCADE:
-- si se borra un curso, se borran sus módulos en cascada.

CREATE TABLE modulos (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    curso_id           UUID          NOT NULL,
    titulo             VARCHAR(200)  NOT NULL,
    descripcion        TEXT,
    orden              SMALLINT      NOT NULL DEFAULT 1,
    duracion_total_min INTEGER       DEFAULT 0,     -- suma de duraciones de lecciones
    total_lecciones    SMALLINT      DEFAULT 0,     -- contador denormalizado
    es_gratuito        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (curso_id, orden),                     -- dos módulos no pueden tener el mismo orden
    CONSTRAINT fk_modulos_curso
        FOREIGN KEY (curso_id) REFERENCES cursos(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_modulos_orden
        CHECK (orden > 0),
    CONSTRAINT chk_modulos_duracion
        CHECK (duracion_total_min >= 0)
);


-- ============================================================================
-- 9. LECCIONES — Unidad mínima de contenido
-- ============================================================================
-- Cada lección pertenece a un módulo. `tipo` determina el formato del
-- contenido. `es_preview` permite muestras gratis antes de comprar.
-- `permite_descarga` es para lecciones tipo 'descarga'.

CREATE TABLE lecciones (
    id               UUID           NOT NULL DEFAULT gen_random_uuid(),
    modulo_id        UUID           NOT NULL,
    tipo             tipo_leccion_e NOT NULL,
    titulo           VARCHAR(200)   NOT NULL,
    descripcion      TEXT,
    contenido_url    VARCHAR(500),               -- URL del video, PDF, etc.
    contenido_texto  TEXT,                       -- contenido embebido (lecturas)
    duracion_min     SMALLINT       NOT NULL DEFAULT 0,
    orden            SMALLINT       NOT NULL DEFAULT 1,
    es_preview       BOOLEAN        NOT NULL DEFAULT FALSE,
    permite_descarga BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (modulo_id, orden),                   -- dos lecciones no pueden tener el mismo orden
    CONSTRAINT fk_lecciones_modulo
        FOREIGN KEY (modulo_id) REFERENCES modulos(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_lecciones_orden
        CHECK (orden > 0),
    CONSTRAINT chk_lecciones_duracion
        CHECK (duracion_min >= 0)
);


-- ============================================================================
-- 10. INSCRIPCIONES — Relación estudiante-curso (transaccional)
-- ============================================================================
-- Registra el momento en que un estudiante compra/accede a un curso.
-- monto_pagado funciona como snapshot: aunque el curso cambie de precio
-- después, la inscripción conserva lo que se pagó (RN-03).
-- comision_plataforma + monto_instructor deben cuadrar con monto_pagado
-- (tolerancia de 1 centavo por redondeo).

CREATE TABLE inscripciones (
    id                      UUID                NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id           UUID                NOT NULL,
    curso_id                UUID                NOT NULL,
    estado                  estado_inscripcion_e NOT NULL DEFAULT 'activa',
    monto_pagado            NUMERIC(10,2)       NOT NULL,
    tasa_comision_aplicada  NUMERIC(5,4)        NOT NULL,     -- ej: 0.3000 = 30%
    comision_plataforma     NUMERIC(10,2)       NOT NULL,
    monto_instructor        NUMERIC(10,2)       NOT NULL,
    fecha_inscripcion       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (estudiante_id, curso_id),            -- RN-01: no inscripciones duplicadas
    CONSTRAINT fk_insc_estudiante
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
    CONSTRAINT fk_insc_curso
        FOREIGN KEY (curso_id) REFERENCES cursos(id),
    CONSTRAINT chk_insc_monto
        CHECK (monto_pagado >= 0),
    CONSTRAINT chk_insc_comision
        CHECK (comision_plataforma >= 0 AND monto_instructor >= 0),
    CONSTRAINT chk_insc_cuadre
        CHECK (ABS((comision_plataforma + monto_instructor) - monto_pagado) < 0.01)
);


-- ============================================================================
-- 11. PAGOS — Registro de transacciones de pago
-- ============================================================================
-- Un pago está asociado a una inscripción. detalles_transaccion (JSONB)
-- guarda la respuesta del gateway de pago (estructura variable por proveedor).

CREATE TABLE pagos (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    inscripcion_id      UUID            NOT NULL,
    metodo_pago         metodo_pago_e   NOT NULL,
    estado              estado_pago_e   NOT NULL DEFAULT 'pendiente',
    monto               NUMERIC(10,2)   NOT NULL,
    moneda              CHAR(3)         NOT NULL DEFAULT 'USD',
    referencia_externa  VARCHAR(255),               -- ID de transacción en el gateway
    proveedor_pago      VARCHAR(50),                -- ej: "stripe", "paypal"
    detalles_transaccion JSONB,                     -- respuesta completa del gateway
    fecha_pago          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    fecha_confirmacion  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_pagos_inscripcion
        FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id),
    CONSTRAINT chk_pagos_monto
        CHECK (monto > 0),
    CONSTRAINT chk_pagos_moneda
        CHECK (moneda ~ '^[A-Z]{3}$')
);


-- ============================================================================
-- 12. CERTIFICADOS — Emitidos al completar un curso (RN-06)
-- ============================================================================
-- Un certificado por inscripción (UNIQUE). codigo_verificacion es público
-- y permite validar la autenticidad del certificado. hash_verificacion
-- es interno (SHA-256) para prevenir falsificaciones.

CREATE TABLE certificados (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    inscripcion_id       UUID          NOT NULL,
    codigo_verificacion  VARCHAR(64)   NOT NULL,
    url_certificado      VARCHAR(500),
    hash_verificacion    VARCHAR(128),
    fecha_emision        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    fecha_vencimiento    TIMESTAMPTZ,              -- NULL = no vence
    activo               BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE (inscripcion_id),                      -- un certificado por inscripción
    UNIQUE (codigo_verificacion),                 -- código único público
    CONSTRAINT fk_certificados_inscripcion
        FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id),
    CONSTRAINT chk_cert_fechas
        CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision)
);


-- ============================================================================
-- 13. LIQUIDACIONES — Pagos a instructores
-- ============================================================================
-- Agrupa inscripciones de un período para calcular cuánto se le debe pagar
-- a un instructor. liquidaciones_detalle desglosa inscripción por inscripción.

CREATE TABLE liquidaciones_instructor (
    id                   UUID                 NOT NULL DEFAULT gen_random_uuid(),
    instructor_id        UUID                 NOT NULL,
    estado               estado_liquidacion_e NOT NULL DEFAULT 'pendiente',
    periodo_inicio       DATE                 NOT NULL,
    periodo_fin          DATE                 NOT NULL,
    total_inscripciones  INTEGER              NOT NULL DEFAULT 0,
    total_bruto          NUMERIC(12,2)        NOT NULL DEFAULT 0.00,
    total_comision       NUMERIC(12,2)        NOT NULL DEFAULT 0.00,
    total_a_pagar        NUMERIC(12,2)        NOT NULL DEFAULT 0.00,
    moneda               CHAR(3)              NOT NULL DEFAULT 'USD',
    metodo_pago          VARCHAR(60),
    referencia_pago      VARCHAR(255),
    comprobante_url      VARCHAR(500),
    notas                TEXT,
    fecha_pago           TIMESTAMPTZ,                 -- cuándo se efectuó el pago real
    fecha_procesado      TIMESTAMPTZ,                 -- cuándo se marcó como pagada
    procesado_por        UUID,                        -- admin que procesó
    created_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_liq_instructor
        FOREIGN KEY (instructor_id) REFERENCES instructores(id),
    CONSTRAINT fk_liq_procesado_por
        FOREIGN KEY (procesado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_liq_periodo
        CHECK (periodo_fin >= periodo_inicio),
    CONSTRAINT chk_liq_totales
        CHECK (total_bruto >= 0 AND total_comision >= 0 AND total_a_pagar >= 0),
    CONSTRAINT chk_liq_moneda
        CHECK (moneda ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_liq_cuadre
        CHECK (ABS((total_bruto - total_comision) - total_a_pagar) < 0.01)
);


-- ============================================================================
-- 14. LIQUIDACIONES DETALLE — Desglose por inscripción
-- ============================================================================
-- Cada fila representa una inscripción incluida en una liquidación.
-- PK compuesta: una inscripción solo puede estar en una liquidación.

CREATE TABLE liquidaciones_detalle (
    liquidacion_id   UUID   NOT NULL,
    inscripcion_id   UUID   NOT NULL,
    monto_bruto      NUMERIC(10,2) NOT NULL,
    monto_comision   NUMERIC(10,2) NOT NULL,
    monto_neto       NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (liquidacion_id, inscripcion_id),
    CONSTRAINT fk_liqdet_liquidacion
        FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones_instructor(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_liqdet_inscripcion
        FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id),
    CONSTRAINT chk_liqdet_montos
        CHECK (monto_bruto >= 0 AND monto_comision >= 0 AND monto_neto >= 0)
);


-- ============================================================================
-- 15. CARRITO DE COMPRAS — Paso intermedio antes de la inscripción
-- ============================================================================
-- precio_snapshot captura el precio del curso al momento de agregar al
-- carrito. Si el curso cambia de precio después, el carrito conserva
-- el valor al que se comprometió el estudiante. UNIQUE(estudiante, curso)
-- evita duplicados en el carrito.

CREATE TABLE carrito_compras (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id   UUID          NOT NULL,
    curso_id        UUID          NOT NULL,
    precio_snapshot NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (estudiante_id, curso_id),
    CONSTRAINT fk_carrito_estudiante
        FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_carrito_curso
        FOREIGN KEY (curso_id) REFERENCES cursos(id)
        ON DELETE CASCADE
);


-- ============================================================================
-- 16. AUDITORÍA — Catálogo de operaciones + log inmutable
-- ============================================================================
-- tipos_operacion_auditoria es una tabla (no ENUM) porque el catálogo de
-- operaciones puede crecer con nuevas funcionalidades.
-- log_auditoria es append-only: NUNCA hacer UPDATE ni DELETE. El campo
-- detalle (JSONB) usa GIN index para búsquedas eficientes.

CREATE TABLE tipos_operacion_auditoria (
    id               SMALLSERIAL   NOT NULL,
    nombre           VARCHAR(80)   NOT NULL,
    descripcion      TEXT,
    PRIMARY KEY (id),
    UNIQUE (nombre)
);

CREATE TABLE log_auditoria (
    id               BIGSERIAL     NOT NULL,     -- BIGSERIAL: se esperan millones de filas
    usuario_id       UUID          NOT NULL,
    operacion_id     SMALLINT      NOT NULL,
    tabla_afectada   VARCHAR(80)   NOT NULL,
    registro_id      UUID          NOT NULL,
    detalle          JSONB,                      -- datos de la operación (antes/después)
    ip_origen        INET,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_log_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_log_operacion
        FOREIGN KEY (operacion_id) REFERENCES tipos_operacion_auditoria(id)
);

-- ============================================================================
-- FIN DEL DDL SIN ÍNDICES
-- ============================================================================
-- Total: 16 tablas, 27 constraints CHECK, 20 FK, 8 ENUM types.
-- Los 27 índices están definidos en db/estructura_db.sql.
-- Para completar la Fase 1:
--   1. Aplicar este archivo en una BD limpia.
--   2. Cargar seed data (Fase 2).
--   3. Ejecutar EXPLAIN ANALYZE en queries de catálogo e inscripciones.
--   4. Aplicar índices y repetir mediciones.
-- ============================================================================
