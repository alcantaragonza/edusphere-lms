require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://mongo:StmrGJVvfQyyBdVBFdIkpQQweglHMpvU@zephyr.proxy.rlwy.net:50693/edusphere?authSource=admin';

const collections = [
  {
    name: 'progreso_lecciones',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['inscripcion_id', 'curso_id', 'estudiante_id', 'progreso_lecciones', 'porcentaje_total'],
        properties: {
          inscripcion_id: { bsonType: 'binData' },
          curso_id: { bsonType: 'binData' },
          estudiante_id: { bsonType: 'binData' },
          progreso_lecciones: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['leccion_id', 'completada', 'porcentaje_visto', 'tiempo_dedicado_seg', 'fecha_inicio'],
              properties: {
                leccion_id: { bsonType: 'binData' },
                completada: { bsonType: 'bool' },
                porcentaje_visto: { bsonType: 'number', minimum: 0, maximum: 100 },
                tiempo_dedicado_seg: { bsonType: 'number', minimum: 0 },
                fecha_inicio: { bsonType: 'date' },
                fecha_completada: { bsonType: 'date' },
              },
            },
          },
          ultima_leccion_vista: { bsonType: 'binData' },
          porcentaje_total: { bsonType: 'number', minimum: 0, maximum: 100 },
          fecha_ultima_actividad: { bsonType: 'date' },
          fecha_inscripcion: { bsonType: 'date' },
        },
      },
    },
  },
  {
    name: 'logs_actividad',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['usuario_id', 'tipo_evento', 'timestamp'],
        properties: {
          usuario_id: { bsonType: 'binData' },
          tipo_evento: { bsonType: 'string' },
          timestamp: { bsonType: 'date' },
          metadata: {
            bsonType: 'object',
            properties: {
              curso_id: { bsonType: 'binData' },
              leccion_id: { bsonType: 'binData' },
              inscripcion_id: { bsonType: 'binData' },
            },
          },
        },
      },
    },
  },
  {
    name: 'resenas',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['inscripcion_id', 'curso_id', 'estudiante_id', 'calif_contenido', 'calif_claridad', 'calif_dificultad', 'calif_valor', 'calif_instructor', 'calificacion_promedio'],
        properties: {
          inscripcion_id: { bsonType: 'binData' },
          curso_id: { bsonType: 'binData' },
          estudiante_id: { bsonType: 'binData' },
          instructor_id: { bsonType: 'binData' },
          calif_contenido: { bsonType: 'int', minimum: 1, maximum: 5 },
          calif_claridad: { bsonType: 'int', minimum: 1, maximum: 5 },
          calif_dificultad: { bsonType: 'int', minimum: 1, maximum: 5 },
          calif_valor: { bsonType: 'int', minimum: 1, maximum: 5 },
          calif_instructor: { bsonType: 'int', minimum: 1, maximum: 5 },
          calificacion_promedio: { bsonType: 'number', minimum: 1, maximum: 5 },
          comentario: { bsonType: 'string' },
          titulo_resena: { bsonType: 'string' },
          fecha_resena: { bsonType: 'date' },
          aprobada: { bsonType: 'bool' },
        },
      },
    },
  },
  {
    name: 'cuestionarios_respuestas',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['estudiante_id', 'leccion_id', 'preguntas_respuestas', 'calificacion', 'fecha_intento'],
        properties: {
          estudiante_id: { bsonType: 'binData' },
          leccion_id: { bsonType: 'binData' },
          preguntas_respuestas: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['pregunta_id', 'respuesta', 'correcta'],
              properties: {
                pregunta_id: { bsonType: 'binData' },
                respuesta: { bsonType: 'string' },
                correcta: { bsonType: 'bool' },
              },
            },
          },
          calificacion: { bsonType: 'number', minimum: 0, maximum: 100 },
          puntaje_total: { bsonType: 'int' },
          tiempo_total_seg: { bsonType: 'int', minimum: 0 },
          fecha_intento: { bsonType: 'date' },
          intento_numero: { bsonType: 'int', minimum: 1 },
        },
      },
    },
  },
  {
    name: 'foros',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['curso_id', 'estudiante_id', 'contenido', 'parent_id', 'profundidad'],
        properties: {
          curso_id: { bsonType: 'binData' },
          estudiante_id: { bsonType: 'binData' },
          titulo: { bsonType: 'string' },
          contenido: { bsonType: 'string' },
          parent_id: {},
          ancestro_raiz_id: {},
          profundidad: { bsonType: 'int', minimum: 0 },
          likes_count: { bsonType: 'int', minimum: 0 },
          likes_usuarios: { bsonType: 'array', items: { bsonType: 'binData' } },
          editado: { bsonType: 'bool' },
          fecha_creacion: { bsonType: 'date' },
          fecha_modificacion: { bsonType: 'date' },
          resuelto: { bsonType: 'bool' },
          reportado: { bsonType: 'bool' },
        },
      },
    },
  },
];

async function main() {
  console.log('Conectando a MongoDB...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  for (const col of collections) {
    try {
      const existing = await db.listCollections({ name: col.name }).toArray();
      if (existing.length > 0) {
        console.log(`[EXISTE] ${col.name} — se omite creacion`);
        continue;
      }
      await db.createCollection(col.name, { validator: col.validator, validationLevel: 'moderate', validationAction: 'warn' });
      console.log(`[CREADO] ${col.name}`);
    } catch (err) {
      console.error(`[ERROR] ${col.name}:`, err.message);
    }
  }

  console.log('\nCreando indices...');

  try { await db.collection('progreso_lecciones').createIndex({ inscripcion_id: 1 }, { unique: true, name: 'idx_inscripcion_unico' }); } catch (_) {}
  try { await db.collection('progreso_lecciones').createIndex({ estudiante_id: 1 }, { name: 'idx_estudiante' }); } catch (_) {}
  try { await db.collection('progreso_lecciones').createIndex({ curso_id: 1 }, { name: 'idx_curso' }); } catch (_) {}

  try { await db.collection('logs_actividad').createIndex({ usuario_id: 1, timestamp: -1 }, { name: 'idx_usuario_timestamp' }); } catch (_) {}
  try { await db.collection('logs_actividad').createIndex({ tipo_evento: 1, timestamp: -1 }, { name: 'idx_evento_timestamp' }); } catch (_) {}
  try { await db.collection('logs_actividad').createIndex({ 'metadata.curso_id': 1 }, { sparse: true, name: 'idx_curso' }); } catch (_) {}
  try { await db.collection('logs_actividad').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000, name: 'idx_ttl_90dias' }); } catch (_) {}

  try { await db.collection('resenas').createIndex({ inscripcion_id: 1 }, { unique: true, name: 'idx_inscripcion_unico' }); } catch (_) {}
  try { await db.collection('resenas').createIndex({ curso_id: 1, fecha_resena: -1 }, { name: 'idx_curso_fecha' }); } catch (_) {}
  try { await db.collection('resenas').createIndex({ instructor_id: 1 }, { name: 'idx_instructor' }); } catch (_) {}
  try { await db.collection('resenas').createIndex({ aprobada: 1, fecha_resena: -1 }, { name: 'idx_aprobada_fecha' }); } catch (_) {}

  try { await db.collection('cuestionarios_respuestas').createIndex({ estudiante_id: 1, leccion_id: 1, intento_numero: 1 }, { name: 'idx_estudiante_leccion_intento' }); } catch (_) {}
  try { await db.collection('cuestionarios_respuestas').createIndex({ leccion_id: 1, fecha_intento: -1 }, { name: 'idx_leccion_fecha' }); } catch (_) {}

  try { await db.collection('foros').createIndex({ curso_id: 1, fecha_creacion: -1 }, { name: 'idx_curso_fecha' }); } catch (_) {}
  try { await db.collection('foros').createIndex({ estudiante_id: 1 }, { name: 'idx_estudiante' }); } catch (_) {}
  try { await db.collection('foros').createIndex({ ancestro_raiz_id: 1, profundidad: 1 }, { name: 'idx_raiz_profundidad' }); } catch (_) {}

  console.log('Indices creados.');
  console.log('\nColecciones existentes:');
  const cols = await db.listCollections().toArray();
  cols.forEach(c => console.log(`  - ${c.name}`));

  await mongoose.disconnect();
  console.log('\nListo.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
