// ================================================================
//  MongoDB — Plataforma de Cursos Online
//  Ejecutar con: mongosh <database> < mongodb_estructura.js
//  3 colecciones: progreso_lecciones, logs_actividad, resenas
// ================================================================

// ----------------------------------------------------------------
//  1. COLECCIÓN: progreso_lecciones
//  Documento por inscripción. Array embebido de lecciones porque
//  el progreso de N lecciones siempre se lee junto (patrón "one to
//  few", N < 100). Denormaliza curso_id y estudiante_id para
//  evitar JOIN con PostgreSQL en queries frecuentes.
// ----------------------------------------------------------------
db.createCollection("progreso_lecciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["inscripcion_id", "curso_id", "estudiante_id",
                 "progreso_lecciones", "porcentaje_total"],
      properties: {
        inscripcion_id: {
          bsonType: "binData",
          description: "UUID de PostgreSQL → inscripciones.id"
        },
        curso_id: {
          bsonType: "binData",
          description: "UUID de PostgreSQL → cursos.id. Denormalizado para queries rápidas."
        },
        estudiante_id: {
          bsonType: "binData",
          description: "UUID de PostgreSQL → estudiantes.id. Denormalizado."
        },
        progreso_lecciones: {
          bsonType: "array",
          description: "Array embebido: máximo ~100 lecciones por curso. Acceso siempre conjunto.",
          items: {
            bsonType: "object",
            required: ["leccion_id", "completada", "porcentaje_visto",
                       "tiempo_dedicado_seg", "fecha_inicio"],
            properties: {
              leccion_id:        { bsonType: "binData", description: "UUID → lecciones.id" },
              completada:        { bsonType: "bool" },
              porcentaje_visto:  { bsonType: "number", minimum: 0, maximum: 100 },
              tiempo_dedicado_seg: { bsonType: "number", minimum: 0 },
              fecha_inicio:      { bsonType: "date" },
              fecha_completada:  { bsonType: "date" },
              quiz_respuestas:   {
                bsonType: "array",
                description: "Opcional: respuestas del cuestionario si la lección es tipo 'cuestionario'",
                items: {
                  bsonType: "object",
                  properties: {
                    pregunta:  { bsonType: "string" },
                    respuesta: { bsonType: "string" },
                    correcta:  { bsonType: "bool" }
                  }
                }
              }
            }
          }
        },
        ultima_leccion_vista: {
          bsonType: "binData",
          description: "UUID de la última lección visitada. Para retomar donde dejó."
        },
        porcentaje_total: {
          bsonType: "number",
          minimum: 0,
          maximum: 100,
          description: "lecciones_completadas / total_lecciones * 100. Actualizado por la app."
        },
        fecha_ultima_actividad: {
          bsonType: "date",
          description: "Última vez que el estudiante interactuó con cualquier lección del curso."
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// índices progreso_lecciones
db.progreso_lecciones.createIndex(
  { "inscripcion_id": 1 },
  { unique: true, name: "idx_inscripcion_unico" }
);
db.progreso_lecciones.createIndex(
  { "estudiante_id": 1 },
  { name: "idx_estudiante" }
);
db.progreso_lecciones.createIndex(
  { "curso_id": 1 },
  { name: "idx_curso" }
);

// --- registro de prueba: progreso_lecciones ---
db.progreso_lecciones.insertOne({
  inscripcion_id: UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
  curso_id:       UUID("11111111-2222-3333-4444-555555555555"),
  estudiante_id:  UUID("aaaa1111-bbbb-2222-cccc-3333dddd4444"),
  progreso_lecciones: [
    {
      leccion_id: UUID("b0000001-0000-0000-0000-000000000001"),
      completada: true,
      porcentaje_visto: 100,
      tiempo_dedicado_seg: 720,
      fecha_inicio: ISODate("2026-05-10T14:30:00Z"),
      fecha_completada: ISODate("2026-05-10T14:42:00Z"),
      quiz_respuestas: []
    },
    {
      leccion_id: UUID("b0000001-0000-0000-0000-000000000002"),
      completada: true,
      porcentaje_visto: 100,
      tiempo_dedicado_seg: 540,
      fecha_inicio: ISODate("2026-05-11T09:00:00Z"),
      fecha_completada: ISODate("2026-05-11T09:09:00Z"),
      quiz_respuestas: [
        { pregunta: "¿Qué es una promesa en JavaScript?", respuesta: "Un objeto que representa un valor futuro", correcta: true },
        { pregunta: "¿Qué devuelve async/await?", respuesta: "Una promesa", correcta: true }
      ]
    },
    {
      leccion_id: UUID("b0000001-0000-0000-0000-000000000003"),
      completada: false,
      porcentaje_visto: 45,
      tiempo_dedicado_seg: 300,
      fecha_inicio: ISODate("2026-05-12T16:00:00Z"),
      fecha_completada: null,
      quiz_respuestas: []
    }
  ],
  ultima_leccion_vista: UUID("b0000001-0000-0000-0000-000000000003"),
  porcentaje_total: 66.67,  // 2 de 3 lecciones = ~67%
  fecha_ultima_actividad: ISODate("2026-05-12T16:05:00Z")
});


// ----------------------------------------------------------------
//  2. COLECCIÓN: logs_actividad
//  Alto volumen (5000+ docs). Eventos sueltos, cada acción del
//  estudiante genera un documento. TTL index para rotación
//  automática a los 90 días — evita crecimiento infinito.
//  Estructura plana por evento (no embebida) para escritura rápida.
// ----------------------------------------------------------------
db.createCollection("logs_actividad", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "tipo_evento", "timestamp"],
      properties: {
        usuario_id: {
          bsonType: "binData",
          description: "UUID → usuarios.id. Quién ejecutó la acción."
        },
        tipo_evento: {
          bsonType: "string",
          enum: [
            "leccion_iniciada",
            "leccion_completada",
            "video_pausado",
            "video_reanudado",
            "video_completado",
            "cuestionario_iniciado",
            "cuestionario_completado",
            "descarga_recurso",
            "inscripcion_realizada",
            "certificado_emitido",
            "resena_publicada",
            "login",
            "logout"
          ],
          description: "Catálogo cerrado de eventos rastreables."
        },
        timestamp: {
          bsonType: "date",
          description: "Cuándo ocurrió el evento."
        },
        metadata: {
          bsonType: "object",
          description: "Contexto variable según tipo_evento. Campos opcionales.",
          properties: {
            curso_id:               { bsonType: "binData" },
            leccion_id:             { bsonType: "binData" },
            inscripcion_id:         { bsonType: "binData" },
            tiempo_reproduccion:    { bsonType: "number" },
            porcentaje_visto:       { bsonType: "number" },
            puntuacion_quiz:        { bsonType: "number" },
            ip_origen:              { bsonType: "string" },
            user_agent:             { bsonType: "string" }
          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// índices logs_actividad
db.logs_actividad.createIndex(
  { "usuario_id": 1, "timestamp": -1 },
  { name: "idx_usuario_timestamp" }
);
db.logs_actividad.createIndex(
  { "tipo_evento": 1, "timestamp": -1 },
  { name: "idx_evento_timestamp" }
);
db.logs_actividad.createIndex(
  { "metadata.curso_id": 1 },
  { name: "idx_curso", sparse: true }
);
// TTL: elimina documentos automáticamente después de 90 días
db.logs_actividad.createIndex(
  { "timestamp": 1 },
  { expireAfterSeconds: 7776000, name: "idx_ttl_90dias" }
);

// --- registro de prueba: logs_actividad ---
db.logs_actividad.insertOne({
  usuario_id: UUID("aaaa1111-bbbb-2222-cccc-3333dddd4444"),
  tipo_evento: "leccion_iniciada",
  timestamp: ISODate("2026-05-10T14:30:00Z"),
  metadata: {
    curso_id:   UUID("11111111-2222-3333-4444-555555555555"),
    leccion_id: UUID("b0000001-0000-0000-0000-000000000001"),
    ip_origen:  "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0"
  }
});


// ----------------------------------------------------------------
//  3. COLECCIÓN: resenas
//  Movida desde PostgreSQL. Datos semi-estructurados con
//  calificaciones multidimensionales. No participa en transacciones
//  ACID (inscripciones/liquidaciones sí). Se consulta mediante
//  aggregation pipelines para promedios por curso/instructor.
//
//  Regla de negocio (RN-05): solo puede reseñar quien tenga ≥ 80%
//  de avance. Validado en la app consultando progreso_lecciones
//  antes de insertar aquí.
// ----------------------------------------------------------------
db.createCollection("resenas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["inscripcion_id", "curso_id", "estudiante_id",
                 "calif_contenido", "calif_claridad", "calif_dificultad",
                 "calif_valor", "calif_instructor", "calificacion_promedio"],
      properties: {
        inscripcion_id: {
          bsonType: "binData",
          description: "UUID → PostgreSQL inscripciones.id. Único: una reseña por inscripción."
        },
        curso_id: {
          bsonType: "binData",
          description: "UUID → cursos.id. Denormalizado para agregación por curso."
        },
        estudiante_id: {
          bsonType: "binData",
          description: "UUID → estudiantes.id. Denormalizado."
        },
        instructor_id: {
          bsonType: "binData",
          description: "UUID → instructores.id. Denormalizado para agregación por instructor."
        },
        calif_contenido:  { bsonType: "int", minimum: 1, maximum: 5 },
        calif_claridad:   { bsonType: "int", minimum: 1, maximum: 5 },
        calif_dificultad: { bsonType: "int", minimum: 1, maximum: 5 },
        calif_valor:      { bsonType: "int", minimum: 1, maximum: 5 },
        calif_instructor: { bsonType: "int", minimum: 1, maximum: 5 },
        calificacion_promedio: {
          bsonType: "number",
          minimum: 1,
          maximum: 5,
          description: "Promedio de las 5 calificaciones. Calculado por la app al insertar."
        },
        comentario:     { bsonType: "string" },
        titulo_resena:  { bsonType: "string", description: "Título corto de la reseña." },
        fecha_resena:   { bsonType: "date" },
        editada:        { bsonType: "bool" },
        fecha_edicion:  { bsonType: "date" },
        aprobada:       { bsonType: "bool", description: "Moderación: false = oculta en catálogo." },
        util_count:     { bsonType: "int", description: "Contador de 'me fue útil'." },
        reportada:      { bsonType: "bool", description: "Flag de contenido inapropiado." }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// índices resenas
db.resenas.createIndex(
  { "inscripcion_id": 1 },
  { unique: true, name: "idx_inscripcion_unico" }
);
db.resenas.createIndex(
  { "curso_id": 1, "fecha_resena": -1 },
  { name: "idx_curso_fecha" }
);
db.resenas.createIndex(
  { "instructor_id": 1 },
  { name: "idx_instructor" }
);
db.resenas.createIndex(
  { "aprobada": 1, "fecha_resena": -1 },
  { name: "idx_aprobada_fecha" }
);

// --- registro de prueba: resenas ---
db.resenas.insertOne({
  inscripcion_id: UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
  curso_id:       UUID("11111111-2222-3333-4444-555555555555"),
  estudiante_id:  UUID("aaaa1111-bbbb-2222-cccc-3333dddd4444"),
  instructor_id:  UUID("99998888-7777-6666-5555-444433332222"),
  calif_contenido:  5,
  calif_claridad:   4,
  calif_dificultad: 3,
  calif_valor:      5,
  calif_instructor: 5,
  calificacion_promedio: 4.4,
  comentario: "Excelente curso. Las explicaciones son claras y los ejercicios prácticos ayudan mucho. El instructor responde dudas en menos de 24h.",
  titulo_resena: "Muy completo y bien explicado",
  fecha_resena: ISODate("2026-06-01T18:30:00Z"),
  editada: false,
  fecha_edicion: null,
  aprobada: true,
  util_count: 12,
  reportada: false
});


// ================================================================
//  RESUMEN DE ÍNDICES
// ================================================================
//
//  progreso_lecciones (3):
//    { inscripcion_id: 1 }            UNIQUE — una entrada por inscripción
//    { estudiante_id: 1 }             queries "mis cursos en progreso"
//    { curso_id: 1 }                  queries "estudiantes de este curso"
//
//  logs_actividad (4):
//    { usuario_id: 1, timestamp: -1 } feed de actividad del usuario
//    { tipo_evento: 1, timestamp: -1 } analytics por tipo de evento
//    { metadata.curso_id: 1 }         SPARSE — actividad por curso
//    { timestamp: 1 }                 TTL 90 días — rotación automática
//
//  resenas (4):
//    { inscripcion_id: 1 }            UNIQUE — una reseña por inscripción
//    { curso_id: 1, fecha_resena: -1} catálogo: reseñas recientes del curso
//    { instructor_id: 1 }             perfil del instructor
//    { aprobada: 1, fecha_resena: -1} moderación + catálogo público
//
// ================================================================
