CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

CREATE TYPE rol_usuario          AS ENUM ('instructor', 'estudiante', 'admin');
CREATE TYPE estado_curso_e       AS ENUM ('borrador', 'publicado', 'archivado');
CREATE TYPE nivel_curso_e        AS ENUM ('principiante', 'intermedio', 'avanzado');
CREATE TYPE tipo_leccion_e       AS ENUM ('video', 'lectura', 'cuestionario', 'descarga');
CREATE TYPE estado_inscripcion_e AS ENUM ('activa', 'completada', 'reembolsada', 'suspendida');
CREATE TYPE estado_liquidacion_e AS ENUM ('pendiente', 'en_revision', 'pagada', 'cancelada');
CREATE TYPE metodo_pago_e        AS ENUM ('tarjeta_credito', 'tarjeta_debito', 'paypal', 'transferencia', 'efectivo');
CREATE TYPE estado_pago_e        AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');

CREATE TABLE configuracion_plataforma (
    id               SMALLSERIAL   NOT NULL,
    clave            VARCHAR(80)   NOT NULL,
    valor            VARCHAR(255)  NOT NULL,
    descripcion      TEXT,
    vigente_desde    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    modificado_por   UUID,
    PRIMARY KEY (id),
    UNIQUE (clave)
);

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
    UNIQUE (email),
    CONSTRAINT chk_usuarios_email
        CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_usuarios_telefono
        CHECK (telefono IS NULL OR telefono ~ '^\+?[0-9]{8,20}$')
);

ALTER TABLE configuracion_plataforma
    ADD CONSTRAINT fk_config_modificado_por
    FOREIGN KEY (modificado_por) REFERENCES usuarios(id)
    ON DELETE SET NULL;

CREATE TABLE instructores (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    usuario_id         UUID          NOT NULL,
    biografia          TEXT,
    titulo_profesional VARCHAR(200),
    anos_experiencia   SMALLINT,
    sitio_web          VARCHAR(500),
    linkedin_url       VARCHAR(500),
    twitter_url        VARCHAR(500),
    metodo_pago        VARCHAR(60),
    referencia_pago    VARCHAR(255),
    calificacion_promedio NUMERIC(3,2) DEFAULT 0.00,
    total_estudiantes  INTEGER       DEFAULT 0,
    total_cursos       INTEGER       DEFAULT 0,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (usuario_id),
    CONSTRAINT fk_instructor_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_instructor_experiencia
        CHECK (anos_experiencia IS NULL OR anos_experiencia >= 0),
    CONSTRAINT chk_instructor_calificacion
        CHECK (calificacion_promedio BETWEEN 0 AND 5)
);

CREATE TABLE estudiantes (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    usuario_id          UUID          NOT NULL,
    pais                CHAR(2),
    ciudad              VARCHAR(100),
    fecha_nacimiento    DATE,
    ocupacion           VARCHAR(100),
    nivel_educativo     VARCHAR(50),
    intereses           TEXT,
    total_cursos        INTEGER       DEFAULT 0,
    total_certificados  INTEGER       DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (usuario_id),
    CONSTRAINT fk_estudiante_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_estudiante_pais
        CHECK (pais IS NULL OR pais ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_estudiante_fecha_nac
        CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento < CURRENT_DATE)
);

CREATE TABLE categorias (
    id               SMALLSERIAL   NOT NULL,
    nombre           VARCHAR(80)   NOT NULL,
    slug             VARCHAR(100)  NOT NULL,
    descripcion      TEXT,
    icono_url        VARCHAR(500),
    color_hex        CHAR(7),
    activa           BOOLEAN       NOT NULL DEFAULT TRUE,
    orden_display    SMALLINT      DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (nombre),
    UNIQUE (slug),
    CONSTRAINT chk_categoria_color
        CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

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
    idioma                CHAR(2)        NOT NULL DEFAULT 'es',
    subtitulos_disponibles TEXT[],
    imagen_portada_url    VARCHAR(500),
    video_preview_url     VARCHAR(500),
    precio                NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    precio_descuento      NUMERIC(10,2),
    moneda                CHAR(3)        NOT NULL DEFAULT 'USD',
    duracion_total_min    INTEGER        NOT NULL DEFAULT 0,
    total_modulos         SMALLINT       DEFAULT 0,
    total_lecciones       SMALLINT       DEFAULT 0,
    calificacion_promedio NUMERIC(3,2)   DEFAULT 0.00,
    total_resenas         INTEGER        DEFAULT 0,
    total_estudiantes     INTEGER        DEFAULT 0,
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

CREATE TABLE modulos (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    curso_id           UUID          NOT NULL,
    titulo             VARCHAR(200)  NOT NULL,
    descripcion        TEXT,
    orden              SMALLINT      NOT NULL DEFAULT 1,
    duracion_total_min INTEGER       DEFAULT 0,
    total_lecciones    SMALLINT      DEFAULT 0,
    es_gratuito        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (curso_id, orden),
    CONSTRAINT fk_modulos_curso
        FOREIGN KEY (curso_id) REFERENCES cursos(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_modulos_orden
        CHECK (orden > 0),
    CONSTRAINT chk_modulos_duracion
        CHECK (duracion_total_min >= 0)
);

CREATE TABLE lecciones (
    id               UUID           NOT NULL DEFAULT gen_random_uuid(),
    modulo_id        UUID           NOT NULL,
    tipo             tipo_leccion_e NOT NULL,
    titulo           VARCHAR(200)   NOT NULL,
    descripcion      TEXT,
    contenido_url    VARCHAR(500),
    contenido_texto  TEXT,
    duracion_min     SMALLINT       NOT NULL DEFAULT 0,
    orden            SMALLINT       NOT NULL DEFAULT 1,
    es_preview       BOOLEAN        NOT NULL DEFAULT FALSE,
    permite_descarga BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (modulo_id, orden),
    CONSTRAINT fk_lecciones_modulo
        FOREIGN KEY (modulo_id) REFERENCES modulos(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_lecciones_orden
        CHECK (orden > 0),
    CONSTRAINT chk_lecciones_duracion
        CHECK (duracion_min >= 0)
);

CREATE TABLE inscripciones (
    id                      UUID                NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id           UUID                NOT NULL,
    curso_id                UUID                NOT NULL,
    estado                  estado_inscripcion_e NOT NULL DEFAULT 'activa',
    monto_pagado            NUMERIC(10,2)       NOT NULL,
    tasa_comision_aplicada  NUMERIC(5,4)        NOT NULL,
    comision_plataforma     NUMERIC(10,2)       NOT NULL,
    monto_instructor        NUMERIC(10,2)       NOT NULL,
    fecha_inscripcion       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (estudiante_id, curso_id),
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

CREATE TABLE pagos (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    inscripcion_id      UUID            NOT NULL,
    metodo_pago         metodo_pago_e   NOT NULL,
    estado              estado_pago_e   NOT NULL DEFAULT 'pendiente',
    monto               NUMERIC(10,2)   NOT NULL,
    moneda              CHAR(3)         NOT NULL DEFAULT 'USD',
    referencia_externa  VARCHAR(255),
    proveedor_pago      VARCHAR(50),
    detalles_transaccion JSONB,
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

CREATE TABLE certificados (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    inscripcion_id       UUID          NOT NULL,
    codigo_verificacion  VARCHAR(64)   NOT NULL,
    url_certificado      VARCHAR(500),
    hash_verificacion    VARCHAR(128),
    fecha_emision        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    fecha_vencimiento    TIMESTAMPTZ,
    activo               BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE (inscripcion_id),
    UNIQUE (codigo_verificacion),
    CONSTRAINT fk_certificados_inscripcion
        FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id),
    CONSTRAINT chk_cert_fechas
        CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision)
);

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
    fecha_pago           TIMESTAMPTZ,
    fecha_procesado      TIMESTAMPTZ,
    procesado_por        UUID,
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

CREATE TABLE tipos_operacion_auditoria (
    id               SMALLSERIAL   NOT NULL,
    nombre           VARCHAR(80)   NOT NULL,
    descripcion      TEXT,
    PRIMARY KEY (id),
    UNIQUE (nombre)
);

CREATE TABLE log_auditoria (
    id               BIGSERIAL     NOT NULL,
    usuario_id       UUID          NOT NULL,
    operacion_id     SMALLINT      NOT NULL,
    tabla_afectada   VARCHAR(80)   NOT NULL,
    registro_id      UUID          NOT NULL,
    detalle          JSONB,
    ip_origen        INET,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_log_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_log_operacion
        FOREIGN KEY (operacion_id) REFERENCES tipos_operacion_auditoria(id)
);

CREATE INDEX idx_cursos_instructor ON cursos(instructor_id);
CREATE INDEX idx_cursos_estado     ON cursos(estado);
CREATE INDEX idx_cursos_categoria  ON cursos(categoria_id);
CREATE INDEX idx_cursos_nivel      ON cursos(nivel);
CREATE INDEX idx_cursos_precio     ON cursos(precio);
CREATE INDEX idx_cursos_fecha_pub  ON cursos(fecha_publicacion DESC);
CREATE INDEX idx_cursos_slug       ON cursos(slug);
CREATE INDEX idx_modulos_curso     ON modulos(curso_id);
CREATE INDEX idx_lecciones_modulo  ON lecciones(modulo_id);
CREATE INDEX idx_lecciones_tipo    ON lecciones(tipo);
CREATE INDEX idx_insc_estudiante   ON inscripciones(estudiante_id);
CREATE INDEX idx_insc_curso        ON inscripciones(curso_id);
CREATE INDEX idx_insc_estado       ON inscripciones(estado);
CREATE INDEX idx_insc_fecha        ON inscripciones(fecha_inscripcion DESC);
CREATE INDEX idx_pagos_inscripcion ON pagos(inscripcion_id);
CREATE INDEX idx_pagos_estado      ON pagos(estado);
CREATE INDEX idx_pagos_fecha       ON pagos(fecha_pago DESC);
CREATE INDEX idx_cert_codigo       ON certificados(codigo_verificacion);
CREATE INDEX idx_liq_instructor    ON liquidaciones_instructor(instructor_id);
CREATE INDEX idx_liq_estado        ON liquidaciones_instructor(estado);
CREATE INDEX idx_liq_periodo       ON liquidaciones_instructor(periodo_inicio, periodo_fin);
CREATE INDEX idx_carrito_estudiante  ON carrito_compras(estudiante_id);
CREATE INDEX idx_log_usuario       ON log_auditoria(usuario_id);
CREATE INDEX idx_log_operacion     ON log_auditoria(operacion_id);
CREATE INDEX idx_log_registro      ON log_auditoria(tabla_afectada, registro_id);
CREATE INDEX idx_log_fecha         ON log_auditoria(created_at DESC);
CREATE INDEX idx_log_detalle_gin   ON log_auditoria USING GIN (detalle);
