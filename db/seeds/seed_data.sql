CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

TRUNCATE TABLE
  log_auditoria,
  liquidaciones_detalle,
  liquidaciones_instructor,
  certificados,
  pagos,
  inscripciones,
  preguntas,
  lecciones,
  modulos,
  carrito_compras,
  cursos,
  estudiantes,
  instructores,
  categorias,
  tipos_operacion_auditoria,
  configuracion_plataforma,
  usuarios
CASCADE;

DO $$
DECLARE
  v_nombres TEXT[] := ARRAY[
    'María','José','Carlos','Ana','Luis','Elena','Juan','Sofía','Pedro','Laura',
    'Miguel','Diana','Andrés','Carmen','Jorge','Isabel','Ricardo','Valentina','Diego','Mónica',
    'Fernando','Paola','Gabriel','Rosa','Alejandro','Teresa','Víctor','Patricia','Sergio','Andrea',
    'Alberto','Claudia','Héctor','Silvia','Óscar','Lorena','Francisco','Mariana','Esteban','Camila'
  ];
  v_apellidos TEXT[] := ARRAY[
    'García','Rodríguez','López','Martínez','González','Hernández','Pérez','Sánchez',
    'Ramírez','Torres','Flores','Rivera','Díaz','Morales','Ortiz','Ruiz','Castillo',
    'Vargas','Ramos','Mendoza','Reyes','Cruz','Jiménez','Vega','Medina','Castro',
    'Guzmán','Álvarez','Romero','Silva','Peña','Delgado','Chávez','Soto','Campos','Rojas'
  ];
  v_cat_nombres TEXT[] := ARRAY[
    'Desarrollo Web','Ciencia de Datos','Diseño UX/UI','Marketing Digital',
    'Negocios','Idiomas','Desarrollo Personal','Música y Audio'
  ];
  v_cat_slugs TEXT[] := ARRAY[
    'desarrollo-web','ciencia-de-datos','diseno-ux-ui','marketing-digital',
    'negocios','idiomas','desarrollo-personal','musica-y-audio'
  ];
  v_cat_descripciones TEXT[] := ARRAY[
    'Aprende a crear sitios y aplicaciones web con tecnologías modernas',
    'Domina el análisis de datos, machine learning e inteligencia artificial',
    'Diseña experiencias digitales centradas en el usuario',
    'Estrategias de marketing en redes sociales, SEO y publicidad online',
    'Administración, finanzas, emprendimiento y liderazgo empresarial',
    'Aprende inglés, francés, alemán y otros idiomas con métodos prácticos',
    'Mejora tus habilidades blandas, productividad y crecimiento personal',
    'Producción musical, mezcla, masterización y teoría musical'
  ];
  v_cat_colores TEXT[] := ARRAY[
    '#3B82F6','#10B981','#F59E0B','#EF4444',
    '#8B5CF6','#EC4899','#14B8A6','#F97316'
  ];
  v_niveles nivel_curso_e[] := ARRAY['principiante','intermedio','avanzado'];
  v_estados_curso estado_curso_e[] := ARRAY['borrador','publicado','archivado'];
  v_tipos_leccion tipo_leccion_e[] := ARRAY['video','lectura','cuestionario','descarga'];
  v_metodos metodo_pago_e[] := ARRAY['tarjeta','transferencia'];
  v_ocupaciones TEXT[] := ARRAY[
    'Estudiante','Ingeniero','Diseñador','Analista','Profesor','Desarrollador',
    'Consultor','Administrador','Contador','Emprendedor','Médico','Arquitecto',
    'Periodista','Abogado','Psicólogo','Vendedor','Chef','Enfermero','Economista',
    'Técnico','Fotógrafo','Músico','Escritor','Traductor','Investigador','Gerente'
  ];
  v_inst_bios TEXT[] := ARRAY[
    'Apasionado por la enseñanza y la tecnología. Más de 10 años formando profesionales.',
    'Experto en el área con amplia trayectoria en proyectos reales. Aprendizaje práctico.',
    'Consultor y formador certificado. Metodología enfocada en resultados.',
    'Investigador y docente universitario. Formación académica de excelencia.',
    'Profesional en activo que comparte su experiencia del mundo real en cada clase.',
    'Especialista con certificaciones internacionales. Contenido actualizado constantemente.',
    'Mentor de startups y empresas. Enfoque práctico con casos reales de negocio.',
    'Creador de contenido educativo con miles de estudiantes satisfechos en línea.',
    'Ingeniero senior con experiencia liderando equipos multidisciplinarios.',
    'Diseñador y desarrollador freelance. Metodología aprender-haciendo.',
    'Coach certificado con más de 500 horas de formación impartida.',
    'Experto en transformación digital y metodologías ágiles de trabajo.',
    'Traductor e intérprete profesional. Método comunicativo para aprender idiomas.',
    'Productor musical con créditos en álbumes comerciales. Enseñanza personalizada.',
    'Científico de datos con publicaciones en revistas indexadas. Rigor académico.'
  ];
  v_cursos_titulos TEXT[] := ARRAY[
    'Fundamentos de Programación Web','Análisis de Datos con Python','Diseño de Interfaces Modernas',
    'Estrategia de Redes Sociales','Finanzas para Emprendedores','Inglés Conversacional Básico',
    'Productividad y Gestión del Tiempo','Producción Musical con Ableton','React Avanzado',
    'Machine Learning Aplicado','Figma para Diseñadores','SEO y Posicionamiento Web',
    'Liderazgo Empresarial','Francés Intermedio','Oratoria y Comunicación Efectiva',
    'Mezcla y Masterización Profesional','Node.js y Express','Big Data con Spark',
    'Diseño de Apps Móviles','Email Marketing y Automatización','Gestión de Proyectos Ágiles',
    'Portugués para Negocios','Inteligencia Emocional','Teoría Musical Completa',
    'TypeScript Full Stack','Deep Learning con TensorFlow','UX Research Avanzado',
    'Publicidad Digital y SEM','Contabilidad para No Contadores','Alemán desde Cero',
    'Hábitos Atómicos y Disciplina','Composición Musical Digital','Docker y Kubernetes',
    'Visualización de Datos con D3','Prototipado Rápido','Analítica Web Avanzada',
    'Gestión del Talento Humano','Italiano para Viajeros','Mindfulness y Reducción de Estrés',
    'Síntesis y Diseño Sonoro','GraphQL y APIs Modernas','SQL para Ciencia de Datos',
    'Diseño Inclusivo y Accesibilidad','Marketing de Contenidos','Planificación Estratégica',
    'Japonés Básico','Escritura Creativa','Guitarra Eléctrica Avanzada',
    'Seguridad Informática Web','Excel para Negocios','Animación 3D con Blender'
  ];
  v_mod_titulos TEXT[] := ARRAY[
    'Introducción','Conceptos Fundamentales','Herramientas y Entorno','Primeros Pasos',
    'Técnicas Básicas','Ejercicios Prácticos','Caso de Estudio','Profundización',
    'Proyecto Intermedio','Técnicas Avanzadas','Optimización','Buenas Prácticas',
    'Integración','Testing y Depuración','Despliegue','Proyecto Final',
    'Fundamentos Teóricos','Aplicación Práctica','Resolución de Problemas',
    'Patrones de Diseño','Refactorización','Escalabilidad','Monitoreo',
    'Automatización','Colaboración','Documentación','Mantenimiento'
  ];
  v_lec_titulos TEXT[] := ARRAY[
    'Presentación del módulo','Conceptos clave','Configuración inicial','Primer ejercicio',
    'Técnica fundamental','Práctica guiada','Análisis de caso','Profundización teórica',
    'Ejercicio integrador','Técnica avanzada','Optimización del proceso','Revisión de código',
    'Implementación','Pruebas unitarias','Despliegue en producción','Resumen y cierre',
    'Fundamentos','Ejemplo práctico','Solución de errores comunes','Integración de componentes',
    'Flujo de trabajo','Control de versiones','Entrega continua','Feedback y mejora'
  ];
  v_lec_tipos tipo_leccion_e[] := ARRAY['video','lectura','cuestionario','descarga'];

  v_admin_id UUID;
  v_user_id UUID;
  v_inst_usu_ids UUID[] := ARRAY[]::UUID[];
  v_inst_ids INT[] := ARRAY[]::INT[];
  v_est_usu_ids UUID[] := ARRAY[]::UUID[];
  v_est_ids UUID[] := ARRAY[]::UUID[];
  v_cat_ids INT[] := ARRAY[]::INT[];
  v_cur_ids UUID[] := ARRAY[]::UUID[];
  v_cur_precios NUMERIC(10,2)[] := ARRAY[]::NUMERIC(10,2)[];
  v_cur_instructor INT[] := ARRAY[]::INT[];
  v_cur_estado estado_curso_e[] := ARRAY[]::estado_curso_e[];
  v_cur_publicados UUID[] := ARRAY[]::UUID[];
  v_mod_ids UUID[] := ARRAY[]::UUID[];
  v_lec_ids UUID[] := ARRAY[]::UUID[];
  v_lec_tipo tipo_leccion_e;
  v_ins_id UUID;
  v_curso_id UUID;
  v_est_id UUID;
  v_completadas UUID[] := ARRAY[]::UUID[];
  v_liq_id UUID;
  v_audit_tipos INT[] := ARRAY[]::INT[];
  i INT;
  j INT;
  k INT;
  l INT;
  v_fecha TIMESTAMPTZ;
  v_monto NUMERIC(10,2);
  v_tasa NUMERIC(5,2);
  v_idx INT;

BEGIN

  INSERT INTO tipos_operacion_auditoria (nombre, descripcion) VALUES
    ('registro_usuario', 'Creación de nueva cuenta de usuario'),
    ('inscripcion_curso', 'Inscripción de estudiante a un curso'),
    ('emision_certificado', 'Emisión de certificado de finalización'),
    ('creacion_curso', 'Publicación de nuevo curso'),
    ('modificacion_curso', 'Edición de información del curso'),
    ('liquidacion_pago', 'Liquidación de pagos a instructor'),
    ('compra_carrito', 'Compra realizada desde el carrito');
  SELECT array_agg(id) INTO v_audit_tipos FROM tipos_operacion_auditoria;

  INSERT INTO usuarios (id, nombre, apellido, email, password_hash, rol)
  VALUES (gen_random_uuid(), 'Admin', 'Sistema', 'admin@edusphere.com', crypt('admin123', gen_salt('bf')), 'admin')
  RETURNING id INTO v_admin_id;

  INSERT INTO configuracion_plataforma (clave, valor, descripcion, modificado_por) VALUES
    ('nombre_plataforma', 'EduSphere LMS', 'Nombre de la plataforma', v_admin_id),
    ('tasa_comision_default', '30', 'Porcentaje de comisión por defecto', v_admin_id),
    ('moneda', 'USD', 'Moneda principal del sistema', v_admin_id),
    ('idioma_default', 'es', 'Idioma por defecto', v_admin_id)
  ;

  WITH ins AS (
    INSERT INTO categorias (nombre, slug, descripcion, color_hex)
    SELECT
      v_cat_nombres[gs],
      v_cat_slugs[gs],
      v_cat_descripciones[gs],
      v_cat_colores[gs]
    FROM generate_series(1, 8) AS gs
    RETURNING id
  )
  SELECT array_agg(id) INTO v_cat_ids FROM ins;

  INSERT INTO usuarios (id, nombre, apellido, email, password_hash, telefono, fecha_nacimiento, rol, modificado_por)
  SELECT
    gen_random_uuid(),
    v_nombres[1 + mod(row_number() over(), array_length(v_nombres, 1))],
    v_apellidos[1 + mod(row_number() over() * 7, array_length(v_apellidos, 1))],
    'instructor' || g || '@edusphere.com',
    crypt('pass123', gen_salt('bf')),
    '+51' || lpad((900000000 + g)::text, 9, '0'),
    (date '1975-01-01' + (random() * interval '25 years'))::date,
    'instructor',
    v_admin_id
  FROM generate_series(1, 15) g;
  v_inst_usu_ids := ARRAY(SELECT id FROM usuarios WHERE rol = 'instructor' ORDER BY email);

  WITH ins AS (
    INSERT INTO instructores (usuario_id, biografia, anos_experiencia, metodo_pago, referencia_pago)
    SELECT
      v_inst_usu_ids[gs],
      v_inst_bios[gs],
      3 + floor(random() * 15)::smallint,
      'transferencia',
      'cuenta-' || lpad(gs::text, 3, '0')
    FROM generate_series(1, 15) gs
    RETURNING id
  )
  SELECT array_agg(id) INTO v_inst_ids FROM ins;

  INSERT INTO usuarios (id, nombre, apellido, email, password_hash, telefono, fecha_nacimiento, rol, modificado_por)
  SELECT
    gen_random_uuid(),
    v_nombres[1 + mod(g * 3, array_length(v_nombres, 1))],
    v_apellidos[1 + mod(g * 11, array_length(v_apellidos, 1))],
    'estudiante' || g || '@edusphere.com',
    crypt('pass123', gen_salt('bf')),
    '+51' || lpad((900000000 + 100 + g)::text, 9, '0'),
    (date '1985-01-01' + (random() * interval '20 years'))::date,
    'estudiante',
    v_admin_id
  FROM generate_series(1, 200) g;
  v_est_usu_ids := ARRAY(SELECT id FROM usuarios WHERE rol = 'estudiante' ORDER BY email);

  WITH ins AS (
    INSERT INTO estudiantes (usuario_id, ocupacion, nivel_educativo, intereses)
    SELECT
      v_est_usu_ids[gs],
      v_ocupaciones[1 + floor(random() * array_length(v_ocupaciones, 1))],
      (ARRAY['Secundaria','Universitario','Posgrado','Maestría'])[1 + floor(random() * 4)],
      (ARRAY['Tecnología','Negocios','Arte','Ciencia','Idiomas'])[1 + floor(random() * 5)]
    FROM generate_series(1, 200) gs
    RETURNING id
  )
  SELECT array_agg(id) INTO v_est_ids FROM ins;

  FOR i IN 1..50 LOOP
    v_curso_id := gen_random_uuid();
    v_monto := round((9.99 + random() * 190.01)::numeric, 2);
    v_cur_ids := array_append(v_cur_ids, v_curso_id);
    v_cur_precios := array_append(v_cur_precios, v_monto);

    IF i <= 25 THEN
      v_cur_estado := array_append(v_cur_estado, 'publicado');
      v_cur_publicados := array_append(v_cur_publicados, v_curso_id);
      v_fecha := now() - (random() * interval '365 days');
    ELSIF i <= 40 THEN
      v_cur_estado := array_append(v_cur_estado, 'borrador');
      v_fecha := NULL;
    ELSE
      v_cur_estado := array_append(v_cur_estado, 'archivado');
      v_fecha := now() - (random() * interval '180 days') - interval '180 days';
    END IF;
    v_cur_instructor := array_append(v_cur_instructor, v_inst_ids[1 + floor(random() * 15)]);

    INSERT INTO cursos (id, instructor_id, categoria_id, estado, nivel, slug, titulo, descripcion, idioma, precio, precio_descuento, duracion_horas, permite_certificado, fecha_publicacion)
    VALUES (
      v_curso_id,
      v_cur_instructor[i],
      v_cat_ids[1 + floor(random() * 8)],
      v_cur_estado[i],
      v_niveles[1 + floor(random() * 3)],
      lower(regexp_replace(v_cursos_titulos[i] || '-' || substr(md5(i::text), 1, 4), '[^a-zA-Z0-9]+', '-', 'g')),
      v_cursos_titulos[i] || ' ' || i::text,
      'Curso completo de ' || v_cursos_titulos[i] || '. Aprende desde cero hasta nivel profesional con ejercicios prácticos y proyectos reales.',
      (ARRAY['Español','Inglés'])[1 + floor(random() * 2)],
      v_monto,
      CASE WHEN random() < 0.3 THEN round((v_monto * 0.7)::numeric, 2) ELSE NULL END,
      round((8 + random() * 32)::numeric, 1),
      random() < 0.8,
      v_fecha
    );
  END LOOP;

  FOR i IN 1..50 LOOP
    FOR j IN 1..(8 + floor(random() * 5)) LOOP
      v_ins_id := gen_random_uuid();
      INSERT INTO modulos (id, curso_id, titulo, descripcion, orden, es_gratuito)
      VALUES (
        v_ins_id,
        v_cur_ids[i],
        v_mod_titulos[1 + mod(j + i, array_length(v_mod_titulos, 1))] || ' - ' || j::text,
        'Exploración detallada de los temas del módulo con recursos complementarios.',
        j,
        j = 1 AND random() < 0.5
      );
      v_mod_ids := array_append(v_mod_ids, v_ins_id);

      FOR k IN 1..(2 + floor(random() * 3)) LOOP
        v_lec_tipo := v_lec_tipos[1 + floor(random() * 4)];
        INSERT INTO lecciones (id, modulo_id, tipo, titulo, contenido_url, duracion_minutos, orden, permite_descarga)
        VALUES (
          gen_random_uuid(),
          v_ins_id,
          v_lec_tipo,
          v_lec_titulos[1 + mod(k + j + i, array_length(v_lec_titulos, 1))] || ' ' || (COALESCE(array_length(v_lec_ids, 1), 0) + 1)::text,
          CASE WHEN v_lec_tipo = 'video' THEN 'https://videos.edusphere.com/leccion-' || gen_random_uuid()::text ELSE NULL END,
          CASE WHEN v_lec_tipo IN ('video','lectura') THEN (5 + floor(random() * 25))::smallint ELSE 0 END,
          k,
          v_lec_tipo = 'descarga'
        );
      END LOOP;
    END LOOP;
  END LOOP;

  v_lec_ids := ARRAY(SELECT id FROM lecciones ORDER BY fecha_creacion);

  FOR i IN 1..array_length(v_lec_ids, 1) LOOP
    IF (SELECT tipo FROM lecciones WHERE id = v_lec_ids[i]) = 'cuestionario' THEN
      FOR j IN 1..(3 + floor(random() * 3)) LOOP
        INSERT INTO preguntas (leccion_id, texto, tipo, opciones, respuesta_correcta, puntos, orden)
        VALUES (
          v_lec_ids[i],
          'Pregunta ' || j::text || ' de la lección: ¿Cuál es la opción correcta?',
          (ARRAY['opcion_multiple','verdadero_falso','respuesta_abierta']::tipo_pregunta_e[])[1 + floor(random() * 3)],
          CASE WHEN random() < 0.5
            THEN jsonb_build_array('Opción A', 'Opción B', 'Opción C', 'Opción D')
            ELSE jsonb_build_array('Verdadero', 'Falso')
          END,
          CASE WHEN random() < 0.5 THEN 'Opción A' ELSE 'Verdadero' END,
          (1 + floor(random() * 3))::smallint,
          j
        );
      END LOOP;
    END IF;
  END LOOP;

  FOR i IN 1..750 LOOP
    v_est_id := v_est_ids[1 + floor(random() * array_length(v_est_ids, 1))];
    v_curso_id := v_cur_publicados[1 + floor(random() * array_length(v_cur_publicados, 1))];
    v_fecha := now() - (random() * interval '365 days');
    v_monto := v_cur_precios[array_position(v_cur_ids, v_curso_id)];
    v_tasa := round((20 + random() * 15)::numeric, 2);

    INSERT INTO inscripciones (estudiante_id, curso_id, estado, monto_pagado, tasa_comision_aplicada, fecha_inscripcion)
    VALUES (
      v_est_id,
      v_curso_id,
      CASE
        WHEN random() < 0.28 THEN 'completado'::estado_inscripcion_e
        WHEN random() < 0.15 THEN 'cancelado'::estado_inscripcion_e
        ELSE 'activo'::estado_inscripcion_e
      END,
      v_monto,
      v_tasa,
      v_fecha
    )
    ON CONFLICT (estudiante_id, curso_id) DO NOTHING
    RETURNING id INTO v_ins_id;

    IF v_ins_id IS NOT NULL THEN
      INSERT INTO pagos (inscripcion_id, monto, metodo_pago, referencia_pago, proveedor_pago, estado, fecha_pago)
      VALUES (
        v_ins_id,
        v_monto,
        v_metodos[1 + floor(random() * 2)],
        'ref-' || replace(gen_random_uuid()::text, '-', ''),
        (ARRAY['Stripe','PayPal','MercadoPago'])[1 + floor(random() * 3)],
        'completado'::estado_pago_e,
        v_fecha
      );

      INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion, fecha_operacion)
      VALUES (
        v_est_usu_ids[array_position(v_est_ids, v_est_id)],
        v_audit_tipos[2],
        'inscripciones',
        v_ins_id,
        jsonb_build_object('monto', v_monto, 'curso_id', v_curso_id),
        v_fecha
      );
    END IF;

    v_ins_id := NULL;
  END LOOP;

  v_completadas := ARRAY(SELECT id FROM inscripciones WHERE estado = 'completado');

  FOR i IN 1..LEAST(150, array_length(v_completadas, 1)) LOOP
    v_ins_id := v_completadas[i];
    SELECT fecha_inscripcion INTO v_fecha FROM inscripciones WHERE id = v_ins_id;

    INSERT INTO certificados (inscripcion_id, codigo_certificado, url_certificado, fecha_emision)
    VALUES (
      v_ins_id,
      'CERT-' || upper(replace(gen_random_uuid()::text, '-', '')),
      'https://cert.edusphere.com/' || replace(gen_random_uuid()::text, '-', ''),
      v_fecha + (random() * interval '90 days')
    )
    ON CONFLICT (inscripcion_id) DO NOTHING;

    INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion, fecha_operacion)
    SELECT
      u.id,
      v_audit_tipos[3],
      'certificados',
      v_ins_id,
      jsonb_build_object('inscripcion_id', v_ins_id),
      v_fecha + (random() * interval '90 days')
    FROM inscripciones ins
    JOIN estudiantes e ON e.id = ins.estudiante_id
    JOIN usuarios u ON u.id = e.usuario_id
    WHERE ins.id = v_ins_id;
  END LOOP;

  FOR i IN 1..12 LOOP
    v_liq_id := gen_random_uuid();
    v_fecha := date_trunc('month', now()) - (i || ' months')::interval;
    v_monto := round((500 + random() * 2000)::numeric, 2);
    v_tasa := round((25 + random() * 10)::numeric, 2);

    INSERT INTO liquidaciones_instructor (id, instructor_id, estado, monto_total, tasa_comision_aplicada, total_inscripciones, total_bruto, total_neto, fecha_liquidacion)
    VALUES (
      v_liq_id,
      v_inst_ids[1 + floor(random() * 15)],
      (ARRAY['pendiente','pagada']::estado_liquidacion_e[])[1 + floor(random() * 2)],
      v_monto,
      v_tasa,
      (8 + floor(random() * 20))::integer,
      round((v_monto / (1 - v_tasa / 100))::numeric, 2),
      v_monto,
      v_fecha
    );

    FOR j IN 1..(3 + floor(random() * 8)) LOOP
      INSERT INTO liquidaciones_detalle (liquidacion_id, inscripcion_id, monto_bruto, monto_comision, monto_neto)
      SELECT
        v_liq_id,
        ins.id,
        pag.monto,
        round((pag.monto * v_tasa / 100)::numeric, 2),
        round((pag.monto * (1 - v_tasa / 100))::numeric, 2)
      FROM inscripciones ins
      JOIN pagos pag ON pag.inscripcion_id = ins.id
      WHERE ins.fecha_inscripcion >= v_fecha
        AND ins.fecha_inscripcion < v_fecha + interval '1 month'
      ORDER BY random()
      LIMIT 1
      ON CONFLICT (liquidacion_id, inscripcion_id) DO NOTHING;
    END LOOP;
  END LOOP;

  FOR i IN 1..50 LOOP
    INSERT INTO carrito_compras (estudiante_id, curso_id, precio_snapshot)
    SELECT
      v_est_ids[1 + floor(random() * array_length(v_est_ids, 1))],
      v_cur_publicados[1 + floor(random() * array_length(v_cur_publicados, 1))],
      round((10 + random() * 150)::numeric, 2)
    ON CONFLICT (estudiante_id, curso_id) DO NOTHING;
  END LOOP;

END;
$$;

UPDATE instructores ins SET
  total_cursos = (
    SELECT count(*) FROM cursos c WHERE c.instructor_id = ins.id AND c.estado = 'publicado'
  ),
  total_estudiantes = (
    SELECT count(DISTINCT i.estudiante_id)
    FROM cursos c
    JOIN inscripciones i ON i.curso_id = c.id
    WHERE c.instructor_id = ins.id
  ),
  calificacion_promedio = COALESCE((
    SELECT round(avg(calificacion_promedio)::numeric, 2)
    FROM cursos c WHERE c.instructor_id = ins.id AND c.calificacion_promedio > 0
  ), 0.00)
;

UPDATE estudiantes e SET
  total_cursos = COALESCE((
    SELECT count(*) FROM inscripciones WHERE estudiante_id = e.id AND estado IN ('activo','completado')
  ), 0),
  total_certificados = COALESCE((
    SELECT count(*) FROM certificados c
    JOIN inscripciones i ON i.id = c.inscripcion_id
    WHERE i.estudiante_id = e.id
  ), 0)
;

UPDATE cursos c SET
  total_estudiantes = COALESCE((
    SELECT count(*) FROM inscripciones WHERE curso_id = c.id AND estado IN ('activo','completado')
  ), 0)
;

UPDATE modulos m SET
  total_lecciones = COALESCE((SELECT count(*) FROM lecciones WHERE modulo_id = m.id), 0),
  duracion_total_min = COALESCE((SELECT sum(duracion_minutos) FROM lecciones WHERE modulo_id = m.id), 0)
;

COMMIT;
