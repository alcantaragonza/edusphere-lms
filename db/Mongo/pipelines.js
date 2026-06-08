/**
 * MongoDB — Pipelines de agregacion RC-08 a RC-11
 *
 * Requisito del enunciado (seccion 5.3):
 *   - 4 pipelines de aggregation (minimo 1 con $facet)
 *   - 1 funcion JS de procesamiento
 *
 * Cada pipeline se ejecuta contra MongoDB via mongoose.connection.db.
 * Los UUIDs usados en los ejemplos corresponden a datos reales de Railway.
 *
 * Ejecutar: node db/Mongo/pipelines.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_USER = process.env.MONGO_INITDB_ROOT_USERNAME;
const MONGO_PASS = process.env.MONGO_INITDB_ROOT_PASSWORD;
const MONGO_DB = process.env.MONGO_INITDB_DATABASE || 'edusphere';
const mongoUri = `mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

function uuidBin(uuidStr) {
  return new mongoose.Types.UUID(uuidStr);
}

async function main() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log('Conectado a MongoDB\n');

  // ═══════════════════════════════════════════════════════════════
  // RC-08: Leccion de mayor abandono por curso
  //
  // Objetivo: identificar que leccion causa mas desercion en cada
  // curso. Una leccion con alta tasa de abandono indica que es
  // demasiado dificil, aburrida o mal explicada.
  //
  // Estrategia:
  //   1. $unwind: expande el array progreso_lecciones (1 doc por leccion)
  //   2. $group: por curso_id + leccion_id, cuenta total estudiantes
  //      y cuantos completaron
  //   3. $addFields: calcula tasa_abandono = 1 - (completaron / total)
  //   4. $sort + $group: dentro de cada curso, toma la de mayor abandono
  //   5. $lookup opcional a PostgreSQL no disponible aqui
  // ═══════════════════════════════════════════════════════════════
  console.log('═══ RC-08: Leccion de mayor abandono por curso ═══');

  const pipelineRC08 = [
    {
      $unwind: '$progreso_lecciones',
    },
    {
      $group: {
        _id: {
          curso_id: '$curso_id',
          leccion_id: '$progreso_lecciones.leccion_id',
        },
        total_estudiantes: { $sum: 1 },
        completaron: {
          $sum: { $cond: ['$progreso_lecciones.completada', 1, 0] },
        },
      },
    },
    {
      $addFields: {
        tasa_abandono: {
          $round: [
            {
              $subtract: [
                1,
                { $divide: ['$completaron', '$total_estudiantes'] },
              ],
            },
            4,
          ],
        },
      },
    },
    {
      $sort: { '_id.curso_id': 1, tasa_abandono: -1 },
    },
    {
      $group: {
        _id: '$_id.curso_id',
        peor_leccion: { $first: '$_id.leccion_id' },
        tasa_abandono: { $first: '$tasa_abandono' },
        total_estudiantes: { $first: '$total_estudiantes' },
        completaron: { $first: '$completaron' },
      },
    },
    { $sort: { tasa_abandono: -1 } },
    { $limit: 10 },
  ];

  const resultRC08 = await db.collection('progreso_lecciones').aggregate(pipelineRC08).toArray();
  console.log('Top 10 cursos con mayor abandono en una leccion:');
  resultRC08.forEach((r, i) => {
    console.log(`  ${i + 1}. Curso: ${r._id.toString('hex').substring(0, 8)}...`);
    console.log(`     Tasa abandono: ${(r.tasa_abandono * 100).toFixed(1)}%`);
    console.log(`     ${r.completaron}/${r.total_estudiantes} completaron`);
  });

  // ═══════════════════════════════════════════════════════════════
  // RC-09: Tiempo promedio para completar lecciones y cursos
  //
  // Objetivo: medir cuanto tarda un estudiante en completar cada
  // leccion y el curso completo. Util para detectar lecciones
  // demasiado largas o cursos que requieren mas tiempo del estimado.
  //
  // Estrategia:
  //   1. $unwind: expande progreso_lecciones
  //   2. $match: solo lecciones completadas (tienen fecha_completada)
  //   3. $group: por curso_id + leccion_id, calcula tiempo promedio
  //      (fecha_completada - fecha_inicio) y desviacion estandar
  //   4. Segundo $group: por curso_id, promedia todos los tiempos
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ RC-09: Tiempo promedio para completar ═══');

  const pipelineRC09 = [
    { $unwind: '$progreso_lecciones' },
    {
      $match: {
        'progreso_lecciones.completada': true,
        'progreso_lecciones.fecha_completada': { $ne: null },
      },
    },
    {
      $addFields: {
        tiempo_completado_ms: {
          $subtract: [
            '$progreso_lecciones.fecha_completada',
            '$progreso_lecciones.fecha_inicio',
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          curso_id: '$curso_id',
          leccion_id: '$progreso_lecciones.leccion_id',
        },
        tiempo_promedio_min: {
          $avg: { $divide: ['$tiempo_completado_ms', 60000] },
        },
        total_completados: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.curso_id',
        tiempo_promedio_por_leccion: {
          $avg: { $round: ['$tiempo_promedio_min', 1] },
        },
        total_lecciones: { $sum: 1 },
        total_completados: { $sum: '$total_completados' },
      },
    },
    { $sort: { tiempo_promedio_por_leccion: -1 } },
    { $limit: 10 },
  ];

  const resultRC09 = await db.collection('progreso_lecciones').aggregate(pipelineRC09).toArray();
  console.log('Top 10 cursos con mayor tiempo promedio por leccion (minutos):');
  resultRC09.forEach((r, i) => {
    console.log(`  ${i + 1}. Tiempo promedio: ${r.tiempo_promedio_por_leccion} min/leccion`);
    console.log(`     ${r.total_completados} lecciones completadas en ${r.total_lecciones} lecciones`);
  });

  // ═══════════════════════════════════════════════════════════════
  // RC-10: Analisis de cuestionarios — usa $facet
  //
  // Objetivo: analisis multidimensional de los resultados de
  // cuestionarios. REQUISITO: minimo 1 pipeline con $facet.
  //
  // Estrategia con $facet:
  //   $facet permite ejecutar MULTIPLES agregaciones en una sola
  //   pasada sobre los datos. Es como hacer 3 consultas en paralelo
  //   sobre el mismo dataset sin re-escaneos.
  //
  //   Faceta 1 — calificacion_promedio:
  //     Promedio general de todas las calificaciones.
  //
  //   Faceta 2 — intentos_por_estudiante:
  //     Cuantos intentos de cuestionario ha hecho cada estudiante.
  //     Identifica estudiantes con bajo rendimiento (muchos intentos).
  //
  //   Faceta 3 — preguntas_mayor_error:
  //     Que preguntas se fallan mas frecuentemente. Unwinds las
  //     respuestas, filtra las incorrectas, agrupa por pregunta_id
  //     y ordena por cantidad de errores.
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ RC-10: Analisis de cuestionarios ($facet) ═══');

  const pipelineRC10 = [
    {
      $facet: {
        calificacion_promedio: [
          {
            $group: {
              _id: null,
              promedio: { $avg: '$calificacion' },
              minimo: { $min: '$calificacion' },
              maximo: { $max: '$calificacion' },
              total_evaluados: { $sum: 1 },
            },
          },
        ],
        intentos_por_estudiante: [
          {
            $group: {
              _id: '$estudiante_id',
              intentos: { $sum: 1 },
              calificacion_promedio: { $avg: '$calificacion' },
            },
          },
          { $sort: { intentos: -1 } },
          { $limit: 10 },
        ],
        preguntas_mayor_error: [
          { $unwind: '$preguntas_respuestas' },
          { $match: { 'preguntas_respuestas.correcta': false } },
          {
            $group: {
              _id: '$preguntas_respuestas.pregunta_id',
              errores: { $sum: 1 },
            },
          },
          { $sort: { errores: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ];

  const resultRC10 = await db.collection('cuestionarios_respuestas').aggregate(pipelineRC10).toArray();
  const facet = resultRC10[0];

  console.log('Faceta 1 — Calificacion promedio general:');
  facet.calificacion_promedio.forEach(r => {
    console.log(`  Promedio: ${r.promedio.toFixed(1)}% | Min: ${r.minimo}% | Max: ${r.maximo}% | ${r.total_evaluados} intentos`);
  });

  console.log('Faceta 2 — Top 10 estudiantes con mas intentos:');
  facet.intentos_por_estudiante.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.intentos} intentos | Promedio: ${r.calificacion_promedio.toFixed(1)}%`);
  });

  console.log('Faceta 3 — Top 10 preguntas con mas errores:');
  facet.preguntas_mayor_error.forEach((r, i) => {
    console.log(`  ${i + 1}. Pregunta ${r._id.toString('hex').substring(0, 8)}...: ${r.errores} errores`);
  });

  // ═══════════════════════════════════════════════════════════════
  // RC-11: Analisis del foro
  //
  // Objetivo: medir la participacion en los foros por curso.
  // Identificar cursos con comunidad activa vs cursos abandonados.
  //
  // Estrategia:
  //   1. $match: hilos raiz (parent_id: null)
  //   2. $lookup: une con respuestas (ancestro_raiz_id)
  //   3. $addFields: cuenta respuestas y likes totales
  //   4. $group: por curso_id, agrega estadisticas
  //   5. $sort: ordena por participacion total
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ RC-11: Analisis del foro ═══');

  const pipelineRC11 = [
    {
      $match: { parent_id: null },
    },
    {
      $lookup: {
        from: 'foros',
        localField: '_id',
        foreignField: 'ancestro_raiz_id',
        as: 'respuestas',
      },
    },
    {
      $addFields: {
        total_respuestas: { $size: '$respuestas' },
        total_likes: {
          $add: [
            '$likes_count',
            { $sum: '$respuestas.likes_count' },
          ],
        },
        tiene_respuesta_resuelta: {
          $gt: [{ $size: { $filter: { input: '$respuestas', cond: '$$this.resuelto' } } }, 0],
        },
      },
    },
    {
      $group: {
        _id: '$curso_id',
        total_hilos: { $sum: 1 },
        total_respuestas: { $sum: '$total_respuestas' },
        total_likes: { $sum: '$total_likes' },
        hilos_resueltos: { $sum: { $cond: ['$resuelto', 1, 0] } },
        respuestas_promedio: { $avg: '$total_respuestas' },
      },
    },
    {
      $addFields: {
        participacion: {
          $add: ['$total_hilos', '$total_respuestas'],
        },
      },
    },
    { $sort: { participacion: -1 } },
    { $limit: 10 },
  ];

  const resultRC11 = await db.collection('foros').aggregate(pipelineRC11).toArray();
  console.log('Top 10 cursos con mayor participacion en foros:');
  resultRC11.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.total_hilos} hilos + ${r.total_respuestas} resp = ${r.participacion} publicaciones`);
    console.log(`     ${r.hilos_resueltos} hilos resueltos | ${r.respuestas_promedio.toFixed(1)} resp/hilo | ${r.total_likes} likes`);
  });

  await mongoose.disconnect();
  console.log('\nPipelines ejecutados correctamente.');
}

main().catch(err => { console.error('FATAL:', err.message); mongoose.disconnect(); process.exit(1); });
