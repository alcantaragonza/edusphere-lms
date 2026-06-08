-- ============================================================
-- EduSphere LMS — Indices de Rendimiento
-- Ejecutar DESPUES de medir queries sin indices
-- Agrupados por tabla para lectura clara
-- ============================================================

-- cursos -------------------------------------------------------
CREATE INDEX idx_cursos_instructor_id ON cursos(instructor_id);
CREATE INDEX idx_cursos_categoria_id ON cursos(categoria_id);
CREATE INDEX idx_cursos_estado ON cursos(estado);
CREATE INDEX idx_cursos_total_estudiantes ON cursos(total_estudiantes DESC);

-- modulos ------------------------------------------------------
CREATE INDEX idx_modulos_curso_id ON modulos(curso_id);

-- lecciones ----------------------------------------------------
CREATE INDEX idx_lecciones_modulo_id ON lecciones(modulo_id);

-- inscripciones ------------------------------------------------
CREATE INDEX idx_inscripciones_estudiante_id ON inscripciones(estudiante_id);
CREATE INDEX idx_inscripciones_curso_id ON inscripciones(curso_id);
CREATE INDEX idx_inscripciones_estado ON inscripciones(estado);
CREATE INDEX idx_inscripciones_fecha ON inscripciones(fecha_inscripcion DESC);
CREATE INDEX idx_inscripciones_curso_estado ON inscripciones(curso_id, estado);

-- pagos --------------------------------------------------------
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_fecha_pago ON pagos(fecha_pago DESC);
CREATE INDEX idx_pagos_estado_fecha ON pagos(estado, fecha_pago DESC);

-- certificados -------------------------------------------------
CREATE INDEX idx_certificados_activo_fecha ON certificados(activo, fecha_emision DESC);

-- liquidaciones ------------------------------------------------
CREATE INDEX idx_liquidaciones_instructor_id ON liquidaciones_instructor(instructor_id);
CREATE INDEX idx_liquidaciones_fecha ON liquidaciones_instructor(fecha_liquidacion DESC);
CREATE INDEX idx_liquidaciones_detalle_inscripcion ON liquidaciones_detalle(inscripcion_id);

-- carrito_compras ----------------------------------------------
CREATE INDEX idx_carrito_estudiante_id ON carrito_compras(estudiante_id);
CREATE INDEX idx_carrito_curso_id ON carrito_compras(curso_id);

-- log_auditoria ------------------------------------------------
CREATE INDEX idx_log_usuario_fecha ON log_auditoria(usuario_id, fecha_operacion DESC);
CREATE INDEX idx_log_tipo_operacion ON log_auditoria(tipo_operacion_id);
CREATE INDEX idx_log_entidad ON log_auditoria(entidad_afectada, entidad_id);
CREATE INDEX idx_log_detalles_gin ON log_auditoria USING GIN (detalles_operacion);

-- preguntas ----------------------------------------------------
CREATE INDEX idx_preguntas_leccion_id ON preguntas(leccion_id);

-- usuarios -----------------------------------------------------
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
