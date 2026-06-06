
create table usuarios (
    id UUID not null primary key gen_random_uuid(),
    nombre varchar(200) not null,
    apellido varchar(200) not null,
    email varchar(255) not null unique,
    fecha_nacimiento date,
    rol enum('instructor', 'estudiante', 'admin') not null,
    modificado_por smallint not null,
    fecha_registro timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    
    constraint chk_usuarios_email
        check (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
    constraint chk_usuarios_telefono
        check (telefono IS NULL OR telefono ~ '^\+?[0-9]{8,20}$')
)

create table configuracion_plataforma (
    id smallint not null,
    clave varcha(80) not null, 
    valor varchar(255) not null,
    descripcion text,
    modificado_por uuid not null,
    fecha_modificacion timestamptz not null default now(),
    primary key (id),
    unique (clave)
    constraint fk_configuracion_plataforma_modificado_por
        foreign key (modificado_por) references usuarios(id)
)

create table instructores (
    id smallint not null primary key,
    usuario_id UUID not null unique,
    biografia text, 
    anos_experiencia smallint,
    metodo_pago varchar(50),
    referencia_pago varchar(255),
    calificacion_promedio numeric(3,2) default 0.00,
    total_estudiantes integer default 0,
    total_cursos integer default 0,
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_instructores_usuario_id
        foreign key (usuario_id) references usuarios(id) on delete cascade,
)

create table estudiantes(
    id UUID not null default gen_random_uuid() primary key,
    usuario_id UUID not null unique,
    fecha_nacimiento date,
    ocupacion varchar(100),
    nivel_educativo varchar(100),
    intereses text,
    total_cursos integer default 0,
    total_certificados integer default 0,
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_estudiantes_usuario_id
        foreign key (usuario_id) references usuarios(id) on delete cascade,
     constraint chk_estudiantes_fecha_nacimiento
         check (fecha_nacimiento IS NULL OR fecha_nacimiento < CURRENT_DATE)
)

create table categorias(
    id smallint not  null primary key, 
    nombre varchar(100) not null,
    slug varchar(100) not null unique,
    descripcion text,
    icono_url varchar(500),
    color_hex char(7),
    activa boolean not null default true,
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    CONSTRAINT chk_categoria_color
        CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
)

create table cursos (
    id UUID not null default gen_random_uuid() primary key,
    instructor_id smallint not null, 
    categoria_id smallint not null,
    categoria ENUM ('borrador', 'publicado', 'archivado') not null DEFAULT 'borrador',
    nivel enum ('principiante', 'intermedio', 'avanzado') not null default 'principiante',
    slug varchar(100) not null unique,
    titulo varchar(200) not null,
    descripcion text,
    idioma varchar(50),
    imagen_portada_url varchar(500),
    precio numeric(10,2) not null default 0.00,
    precio_descuento numeric(10,2),
    duracion_horas numeric(5,2),
    calificacion_promedio numeric(3,2) default 0.00,
    total_estudiantes integer default 0,
    permite_certificado boolean not null default false,
    fecha_publicacion timestamptz,
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_cursos_instructor_id
        foreign key (instructor_id) references instructores(id) on delete cascade,
    constraint fk_cursos_categoria_id
        foreign key (categoria_id) references categorias(id) on delete set null,
    CONSTRAINT chk_cursos_precio_descuento
        CHECK (precio_descuento IS NULL OR (precio_descuento >= 0 AND precio_descuento < precio)),
    CONSTRAINT chk_cursos_calificacion_promedio
        CHECK (calificacion_promedio >= 0 AND calificacion_promedio <= 5)
)

create table modulos(
    id UUID not null primary key gen_random_uuid(),
    curso_id UUID not null unique,
    titulo varchar(200) not null,
    descripcion text,
    orden SMALLINT not nullt default 1 unique, 
    duracion_total_min INTEGER default 0,
    total_lecciones smallint DEFAULT 0, 
    es_gratuito boolean not null default false, 
    fecha_creacion TIMESTAMP not null default now(),
    fecha_modificacion TIMESTAMP not null default now(),

    constraint fk_modulos_curso 
        foreign key (curso_id) references cursos(id) on delete cascade,
     constraint chk_modulos_orden
         check (orden > 0)
    constraint chk_modulos_duracion_total_min
        check (duracion_total_min >= 0)
)

create table lecciones (
    id UUID not null default gen_random_uuid() primary key,
    modulo_id UUID not null unique,
    tipo enum ('video', 'lectura', 'cuestionario', 'descarga') not null,
    titulo varchar(200) not null,
    descripcion text,
    contenido_url varchar(500),
    contenido_texto text, 
    duracion_minutos smallint not null default 0, 
    orden smallint not null default 1 unique,
    permite_descarga boolean not null default false,
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_lecciones_modulo
        foreign key (modulo_id) references modulos(id) on delete cascade,
     constraint chk_lecciones_orden
         check (orden > 0),
    constraint chk_lecciones_duracion_minutos
        check (duracion_minutos >= 0)
)

create table inscripciones (
    id UUID not null default gen_random_uuid() primary key,
    estudiante_id UUID not null,
    curso_id UUID not null,
    estado enum('activo', 'completado', 'cancelado') not null default 'activo',
    monto_pagado numeric(10,2) not null default 0.00,
    tasa_comision_aplicada numeric(5,2) not null default 0.00,
    fecha_inscripcion timestamptz not null default now(),
    calificacion_final numeric(3,2),
    certificado_obtenido boolean not null default false,
    fecha_modificacion timestamptz not null default now(),
    constraint fk_inscripciones_estudiante_id
        foreign key (estudiante_id) references estudiantes(id) on delete cascade,
    constraint fk_inscripciones_curso_id
        foreign key (curso_id) references cursos(id) on delete cascade,
     constraint chk_inscripciones_calificacion_final
         check (calificacion_final >= 0 AND calificacion_final <= 5)
)

create table pagos (
    id UUID not null default gen_random_uuid() primary key,
    inscripcion_id UUID not null unique,
    monto numeric(10,2) not null,
    metodo_pago enum('tarjeta','transferencia') not null,
    referencia_pago varchar(255),
    proveedor_pago varchar(100),
    detalles_pago jsonb,
    estado enum('pendiente', 'completado', 'fallido') not null default 'pendiente',
    fecha_pago timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_pagos_inscripcion_id
        foreign key (inscripcion_id) references inscripciones(id) on delete cascade
)

create table certificados(
    id UUID not null default gen_random_uuid() primary key,
    inscripcion_id UUID not null unique,
    codigo_certificado varchar(100) not null unique,
    url_certificado varchar(500) not null,
    fecha_emision timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    activo BOOLEAN not null DEFAULT true,
    constraint fk_certificados_inscripcion_id
        foreign key (inscripcion_id) references inscripciones(id) on delete cascade
)

create table liquidaciones_instructor(
    id UUID not null default gen_random_uuid() primary key,
    instructor_id smallint not null,
    estado enum('pendiente', 'pagada', 'cancelada') not null default 'pendiente',
    monto_total numeric(10,2) not null,
    tasa_comision_aplicada numeric(5,2) not null,
    total_inscripciones integer not null default 0,
    total_bruto numeric(10,2) not null,
    total_neto numeric(10,2) not null,
    detalles_liquidacion jsonb,
    fecha_liquidacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_liquidaciones_instructor_instructor_id
        foreign key (instructor_id) references instructores(id) on delete cascade,
        constraint chk_liquidaciones_instructor_monto_total
            check (monto_total >= 0),

)

create table liquidaciones_detalle(
    liquidacion_id UUID not null PRIMARY key UNIQUE,
    inscripcion_id UUID not null,
    monto_bruto numeric(10,2) not null,
    monto_comision numeric(10,2) not null,
    monto_neto numeric(10,2) not null,
    fecha_modificacion timestamptz not null default now(),
    fecha_creacion timestamptz not null default now(),
    constraint fk_liquidaciones_detalle_liquidacion_id
        foreign key (liquidacion_id) references liquidaciones_instructor(id) on delete cascade,
    constraint fk_liquidaciones_detalle_inscripcion_id
        foreign key (inscripcion_id) references inscripciones(id) on delete cascade,
    constraint chk_liquidaciones_detalle_monto_bruto
        check (monto_bruto >= 0),
    constraint chk_liquidaciones_detalle_monto_comision
        check (monto_comision >= 0),
    
)
create table carrrito_compras (
    id UUID not null default gen_random_uuid() primary key,
    estudiante_id UUID not null unique,
    curso_id UUID not null,
    precio_snapshot numeric(10,2) not null
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now(),
    constraint fk_carrito_compras_estudiante_id
        foreign key (estudiante_id) references estudiantes(id) on delete cascade,
    constraint fk_carrito_compras_curso_id
        foreign key (curso_id) references cursos(id) on delete cascade        
)

create table tipos_operacion_auditoria (
    id smallint not null primary key,
    nombre varchar(100) not null unique,
    descripcion text,
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz not null default now()
)

create table log_auditoria (
    id UUID not null default gen_random_uuid() primary key,
    usuario_id UUID not null,
    tipo_operacion_id smallint not null,
    entidad_afectada varchar(100) not null,
    entidad_id UUID,
    detalles_operacion jsonb,
    fecha_operacion timestamptz not null default now(),
    constraint fk_log_auditoria_usuario_id
        foreign key (usuario_id) references usuarios(id) on delete cascade,
    constraint fk_log_auditoria_tipo_operacion_id
        foreign key (tipo_operacion_id) references tipos_operacion_auditoria(id) on delete cascade
)



