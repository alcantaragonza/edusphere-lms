-- ==================================================================
-- EduSphere LMS — INDICES DE RENDIMIENTO
-- ==================================================================
-- PROPOSITO: Este archivo contiene los 26 indices que se crearon DESPUES
-- de medir el rendimiento sin indices (Fase 1 del plan de trabajo).
--
-- Los indices se agrupan en 3 categorias:
--   1. FK indices: aceleran JOINs (PostgreSQL NO indexa FKs automaticamente)
--   2. Filtro/Orden: columnas usadas en WHERE, ORDER BY, GROUP BY
--   3. Compuestos: combinaciones frecuentes de filtro+orden
--
-- NOTA PARA EL REPORTE DE PERFORMANCE:
--   Con los datos del seed (1500 lecciones, 696 inscripciones), PostgreSQL
--   PREFIERE sequential scans sobre indices porque las tablas son pequenas
--   y caben en pocas paginas de disco. Los indices se vuelven criticos
--   cuando el volumen crece (>10K filas). Esto se documento en el EXPLAIN
--   ANALYZE comparativo (queries_performance.sql).
-- ==================================================================

-- ==================================================================
-- TABLA: cursos (4 indices)
-- ==================================================================
-- `instructor_id`: FK a instructores.id. Acelera JOIN en catalogo y
--   dashboard de instructor (WHERE instructor_id = ?).
CREATE INDEX idx_cursos_instructor_id ON cursos(instructor_id);

-- `categoria_id`: FK a categorias.id. Acelera JOIN con categorias y
--   filtros por categoria en el catalogo.
CREATE INDEX idx_cursos_categoria_id ON cursos(categoria_id);

-- `estado`: columna de filtro frecuente (WHERE estado = 'publicado').
--   Catalogo, reportes y validaciones del SP consultan por estado.
--   La columna tiene baja cardinalidad (3 valores) pero se usa en
--   combinacion con otros filtros.
CREATE INDEX idx_cursos_estado ON cursos(estado);

-- `total_estudiantes DESC`: la consulta del catalogo ordena por
--   popularidad. Un indice DESC permite que el ORDER BY se resuelva
--   sin un Sort explicito (Index Scan hacia atras).
CREATE INDEX idx_cursos_total_estudiantes ON cursos(total_estudiantes DESC);

-- ==================================================================
-- TABLA: modulos (1 indice)
-- ==================================================================
-- `curso_id`: FK a cursos.id. Es la consulta mas frecuente de esta tabla:
--   "dame todos los modulos de este curso". Sin este indice, cada carga
--   de pagina de curso hace un Seq Scan sobre 500+ modulos.
CREATE INDEX idx_modulos_curso_id ON modulos(curso_id);

-- ==================================================================
-- TABLA: lecciones (1 indice)
-- ==================================================================
-- `modulo_id`: FK a modulos.id. Misma justificacion que modulos.curso_id.
--   "dame todas las lecciones de este modulo" es la consulta mas frecuente.
CREATE INDEX idx_lecciones_modulo_id ON lecciones(modulo_id);

-- ==================================================================
-- TABLA: inscripciones (5 indices)
-- ==================================================================
-- `estudiante_id`: FK a estudiantes.id. Usado en "mis cursos" del
--   dashboard de estudiante. Sin indice, cada carga escanea 696 filas.
CREATE INDEX idx_inscripciones_estudiante_id ON inscripciones(estudiante_id);

-- `curso_id`: FK a cursos.id. Usado en reportes (top cursos, tasa de
--   finalizacion) y en la vista vw_cursos_estudiante.
CREATE INDEX idx_inscripciones_curso_id ON inscripciones(curso_id);

-- `estado`: filtro frecuente (WHERE estado IN ('activo', 'completado')).
--   El SP valida duplicados y las vistas filtran por estado.
CREATE INDEX idx_inscripciones_estado ON inscripciones(estado);

-- `fecha_inscripcion DESC`: ordenamiento en dashboard (mis cursos
--   recientes primero) y en reportes con rango de fechas.
CREATE INDEX idx_inscripciones_fecha ON inscripciones(fecha_inscripcion DESC);

-- `(curso_id, estado)`: indice COMPUESTO. La consulta mas frecuente es
--   "cuantos estudiantes activos/completados tiene este curso".
--   Un indice compuesto es mas eficiente que dos indices separados
--   porque el optimizador puede resolver toda la query desde el indice
--   sin tocar la tabla (Index Only Scan).
CREATE INDEX idx_inscripciones_curso_estado ON inscripciones(curso_id, estado);

-- ==================================================================
-- TABLA: pagos (3 indices)
-- ==================================================================
-- `estado`: filtro frecuente (WHERE estado = 'completado'). Todos los
--   reportes de ingresos solo consideran pagos completados.
CREATE INDEX idx_pagos_estado ON pagos(estado);

-- `fecha_pago DESC`: usado en reportes con rango de fechas (RC-04,
--   RC-05) y en ordenamiento de ingresos recientes.
CREATE INDEX idx_pagos_fecha_pago ON pagos(fecha_pago DESC);

-- `(estado, fecha_pago DESC)`: indice COMPUESTO. La combinacion de
--   filtro por estado + orden por fecha es el patron mas comun en
--   reportes de ingresos (ej. "pagos completados en el ultimo mes").
--   El optimizador puede usar este indice tanto para el filtro como
--   para el orden, eliminando un Sort explicito.
CREATE INDEX idx_pagos_estado_fecha ON pagos(estado, fecha_pago DESC);

-- ==================================================================
-- TABLA: certificados (1 indice)
-- ==================================================================
-- `(activo, fecha_emision DESC)`: indice COMPUESTO. Las consultas de
--   certificados filtran por activo=true y ordenan por fecha de emision
--   (los mas recientes primero). El indice compuesto permite Index Only
--   Scan si todas las columnas consultadas estan en el indice.
CREATE INDEX idx_certificados_activo_fecha ON certificados(activo, fecha_emision DESC);

-- ==================================================================
-- TABLA: liquidaciones (3 indices)
-- ==================================================================
-- `instructor_id`: FK a instructores.id. Dashboard de instructor muestra
--   liquidaciones por instructor.
CREATE INDEX idx_liquidaciones_instructor_id ON liquidaciones_instructor(instructor_id);

-- `fecha_liquidacion DESC`: ordenamiento cronologico inverso.
CREATE INDEX idx_liquidaciones_fecha ON liquidaciones_instructor(fecha_liquidacion DESC);

-- `inscripcion_id`: FK en liquidaciones_detalle. Acelera el JOIN entre
--   liquidaciones y las inscripciones que las componen.
CREATE INDEX idx_liquidaciones_detalle_inscripcion ON liquidaciones_detalle(inscripcion_id);

-- ==================================================================
-- TABLA: carrito_compras (2 indices)
-- ==================================================================
-- `estudiante_id`: FK a estudiantes.id. "dame el carrito de este
--   estudiante" es la consulta mas frecuente de esta tabla.
CREATE INDEX idx_carrito_estudiante_id ON carrito_compras(estudiante_id);

-- `curso_id`: FK a cursos.id. Usado para validar si un curso ya esta
--   en el carrito de alguien.
CREATE INDEX idx_carrito_curso_id ON carrito_compras(curso_id);

-- ==================================================================
-- TABLA: log_auditoria (4 indices)
-- ==================================================================
-- `(usuario_id, fecha_operacion DESC)`: indice COMPUESTO. Feed de
--   actividad del usuario: "que ha hecho este usuario recientemente".
CREATE INDEX idx_log_usuario_fecha ON log_auditoria(usuario_id, fecha_operacion DESC);

-- `tipo_operacion_id`: FK a tipos_operacion_auditoria. Agrupar eventos
--   por tipo (ej. "todas las inscripciones del dia").
CREATE INDEX idx_log_tipo_operacion ON log_auditoria(tipo_operacion_id);

-- `(entidad_afectada, entidad_id)`: buscar "quien modifico esta entidad".
--   Ej: "historial de cambios del curso X".
CREATE INDEX idx_log_entidad ON log_auditoria(entidad_afectada, entidad_id);

-- `USING GIN (detalles_operacion)`: indice GIN para busquedas en JSONB.
--   Permite consultas como:
--     SELECT * FROM log_auditoria WHERE detalles_operacion @> '{"curso_id": "..."}';
--   GIN indexa todas las claves y valores del JSON, permitiendo busquedas
--   eficientes dentro del documento sin escanear toda la tabla.
--   GIN es mas lento en escritura (cada INSERT/UPDATE debe actualizar el
--   indice) pero mucho mas rapido en lectura para operadores JSONB.
--   Como log_auditoria es append-only (solo INSERTs), el costo de
--   escritura del GIN es aceptable.
CREATE INDEX idx_log_detalles_gin ON log_auditoria USING GIN (detalles_operacion);

-- ==================================================================
-- TABLA: preguntas (1 indice)
-- ==================================================================
-- `leccion_id`: FK a lecciones.id. Cada leccion tipo 'cuestionario'
--   tiene 3-5 preguntas. Cargar las preguntas de una leccion es la
--   consulta mas frecuente de esta tabla.
CREATE INDEX idx_preguntas_leccion_id ON preguntas(leccion_id);

-- ==================================================================
-- TABLA: usuarios (1 indice)
-- ==================================================================
-- `rol`: filtro para separar estudiantes de instructores. El enum
--   rol_usuario tiene 3 valores. Aunque es baja cardinalidad, se usa
--   en consultas como "dame todos los instructores".
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
