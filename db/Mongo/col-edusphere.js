// ================================================================
//  1. COLECCIÓN: progreso_lecciones
// ================================================================

print("\n--- 1/5 progreso_lecciones ---");

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
          description: "UUID de PostgreSQL → cursos.id. Denormalizado."
        },
        estudiante_id: {
          bsonType: "binData",
          description: "UUID de PostgreSQL → estudiantes.id. Denormalizado."
        },
        progreso_lecciones: {
          bsonType: "array",
          description: "Array embebido: máximo ~100 lecciones por curso.",
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
                description: "Opcional: respuestas si la lección es tipo 'cuestionario'",
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
          description: "UUID de la última lección visitada."
        },
        porcentaje_total: {
          bsonType: "number",
          minimum: 0,
          maximum: 100,
          description: "lecciones_completadas / total_lecciones * 100."
        },
        fecha_ultima_actividad: {
          bsonType: "date",
          description: "Última vez que el estudiante interactuó con el curso."
        },
        fecha_inscripcion: {
          bsonType: "date",
          description: "Denormalizado de PostgreSQL → inscripciones.fecha_inscripcion. Inmutable. Necesario para RC-09."
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});
print("  ✓ progreso_lecciones");

// ================================================================
//  2. COLECCIÓN: logs_actividad
// ================================================================

print("\n--- 2/5 logs_actividad ---");

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
            "leccion_iniciada", "leccion_completada",
            "video_pausado", "video_reanudado", "video_completado",
            "cuestionario_iniciado", "cuestionario_completado",
            "descarga_recurso", "inscripcion_realizada",
            "certificado_emitido", "resena_publicada",
            "login", "logout"
          ],
          description: "Catálogo cerrado de eventos rastreables."
        },
        timestamp: {
          bsonType: "date",
          description: "Cuándo ocurrió el evento."
        },
        metadata: {
          bsonType: "object",
          description: "Contexto variable según tipo_evento.",
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
print("  ✓ logs_actividad");

// ================================================================
//  3. COLECCIÓN: resenas
// ================================================================

print("\n--- 3/5 resenas ---");

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
          description: "UUID → instructores.usuario_id. Denormalizado para agregación por instructor."
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
          description: "Promedio de las 5 calificaciones. Calculado por la app."
        },
        comentario:     { bsonType: "string" },
        titulo_resena:  { bsonType: "string" },
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
print("  ✓ resenas");

// ================================================================
//  4. COLECCIÓN: cuestionarios_respuestas
// ================================================================

print("\n--- 4/5 cuestionarios_respuestas ---");

db.createCollection("cuestionarios_respuestas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["estudiante_id", "leccion_id", "preguntas_respuestas",
                 "calificacion", "fecha_intento"],
      properties: {
        estudiante_id: {
          bsonType: "binData",
          description: "UUID → PostgreSQL estudiantes.id"
        },
        leccion_id: {
          bsonType: "binData",
          description: "UUID → PostgreSQL lecciones.id"
        },
        preguntas_respuestas: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["pregunta_id", "respuesta", "correcta"],
            properties: {
              pregunta_id: { bsonType: "binData", description: "UUID → preguntas.id" },
              respuesta:   { bsonType: "string" },
              correcta:    { bsonType: "bool" }
            }
          }
        },
        calificacion: {
          bsonType: "number",
          minimum: 0,
          maximum: 100,
          description: "Porcentaje de aciertos (0–100)"
        },
        puntaje_total: {
          bsonType: "int",
          description: "Puntos obtenidos"
        },
        tiempo_total_seg: {
          bsonType: "int",
          minimum: 0,
          description: "Tiempo que tardó en responder el cuestionario"
        },
        fecha_intento: {
          bsonType: "date"
        },
        intento_numero: {
          bsonType: "int",
          minimum: 1,
          description: "Número de intento (1 = primer intento)"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});
print("  ✓ cuestionarios_respuestas");

// ================================================================
//  5. COLECCIÓN: foros
// ================================================================

print("\n--- 5/5 foros ---");

db.createCollection("foros", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["curso_id", "estudiante_id", "contenido",
                 "parent_id", "profundidad"],
      properties: {
        curso_id: {
          bsonType: "binData",
          description: "UUID → PostgreSQL cursos.id"
        },
        estudiante_id: {
          bsonType: "binData",
          description: "UUID → PostgreSQL estudiantes.id. Autor de la publicación."
        },
        titulo: {
          bsonType: "string",
          description: "Título del hilo. Obligatorio para hilos raíz (parent_id: null)."
        },
        contenido: {
          bsonType: "string",
          description: "Cuerpo de la publicación o respuesta."
        },
        parent_id: {
          description: "null = hilo raíz; UUID = respuesta a otra publicación (auto-referencia a foros._id)."
        },
        ancestro_raiz_id: {
          description: "UUID del hilo raíz al que pertenece. null si es raíz. Denormalizado."
        },
        profundidad: {
          bsonType: "int",
          minimum: 0,
          description: "0 = hilo raíz, 1 = respuesta directa, 2+ = sub-respuestas."
        },
        likes_count: {
          bsonType: "int",
          minimum: 0,
          description: "Contador de 'me gusta'. Se actualiza con $inc."
        },
        likes_usuarios: {
          bsonType: "array",
          description: "Array de UUIDs → estudiantes.id que dieron like.",
          items: { bsonType: "binData" }
        },
        editado: {
          bsonType: "bool",
          description: "true si el contenido fue modificado."
        },
        fecha_creacion: {
          bsonType: "date"
        },
        fecha_modificacion: {
          bsonType: "date",
          description: "null si nunca se editó."
        },
        resuelto: {
          bsonType: "bool",
          description: "El autor marcó esta respuesta como solución."
        },
        reportado: {
          bsonType: "bool",
          description: "Flag de contenido inapropiado para moderación."
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});
print("  ✓ foros");

// ================================================================
//  RESUMEN
// ================================================================
print("\n================================================================");
print(" 5 colecciones creadas:");
print("   1. progreso_lecciones");
print("   2. logs_actividad");
print("   3. resenas");
print("   4. cuestionarios_respuestas");
print("   5. foros");
print("================================================================");