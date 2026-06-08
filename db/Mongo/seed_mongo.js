/**
 * Seed Data MongoDB — conectado a UUIDs reales de PostgreSQL (Railway)
 *
 * Flujo:
 *   1. Lee datos maestros de PostgreSQL (inscripciones, lecciones, estudiantes, etc.)
 *   2. Genera documentos coherentes vinculados a UUIDs reales
 *   3. Inserta en MongoDB (Railway)
 *
 * Ejecutar: node db/Mongo/seed_mongo.js
 * Requiere: MONGO_HOST, MONGO_PORT, MONGO_INITDB_ROOT_USERNAME,
 *           MONGO_INITDB_ROOT_PASSWORD, MONGO_INITDB_DATABASE
 *           PG vars en .env
 */
require('dotenv').config();
const { Pool } = require('pg');
const mongoose = require('mongoose');

// ─── Conexiones ────────────────────────────────────────────────
const pg = new Pool({
  host: process.env.POSTGRES_HOST || 'acela.proxy.rlwy.net',
  port: Number(process.env.POSTGRES_PORT) || 42156,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'railway',
  max: 5,
});

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_USER = process.env.MONGO_INITDB_ROOT_USERNAME;
const MONGO_PASS = process.env.MONGO_INITDB_ROOT_PASSWORD;
const MONGO_DB = process.env.MONGO_INITDB_DATABASE || 'edusphere';
const mongoUri = `mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

// ─── Helpers ────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function uuidToBin(uuidStr) {
  if (!uuidStr) return null;
  return new mongoose.Types.UUID(uuidStr);
}

function randomDate(start, endDays) {
  const d = new Date(start);
  d.setDate(d.getDate() + rand(1, endDays));
  d.setHours(rand(0, 23), rand(0, 59), rand(0, 59));
  return d;
}

function randomDateBetween(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s));
}

const comentariosList = [
  'Excelente curso. El instructor explica con mucha claridad.',
  'Muy completo. Los ejercicios practicos ayudan a entender mejor.',
  'Buen contenido pero podria tener mas ejemplos practicos.',
  'Me encanto la metodologia. Aprendi mucho en poco tiempo.',
  'El instructor es muy paciente y resuelve todas las dudas.',
  'Curso recomendado para principiantes. Muy bien estructurado.',
  'Las lecciones en video son de alta calidad. Vale la pena.',
  'Me hubiera gustado mas profundidad en los temas avanzados.',
  'Excelente relacion calidad-precio. Volveria a tomar otro curso.',
  'El contenido esta desactualizado en algunas secciones.',
  'Muy buenos los cuestionarios. Ayudan a fijar el conocimiento.',
  'La plataforma es facil de usar y el contenido esta bien organizado.',
  'Aprendi habilidades que ya estoy aplicando en mi trabajo.',
  'El ritmo del curso es adecuado. Ni muy rapido ni muy lento.',
  'Falta material complementario para practicar fuera de clase.',
  'Instructor excepcional. Se nota que domina el tema.',
  'Curso denso pero muy gratificante al terminarlo.',
  'Las descargas son utiles para repasar sin conexion.',
  'Me gustaria que hubiera mas interaccion con otros estudiantes.',
  'Contenido practico y directo al grano. Sin relleno.',
  'Supero mis expectativas. Pensaba que seria mas basico.',
  'Buen curso introductorio pero necesita una segunda parte.',
  'Los ejemplos del mundo real hacen la diferencia.',
  'La seccion de proyectos es lo mejor del curso.',
  'Instructor responde preguntas rapidamente. Muy atento.',
  'El audio de algunos videos podria mejorar.',
  'Curso muy bien estructurado. Facil de seguir.',
  'Aprendi mas que en cursos presenciales que he tomado.',
  'Excelente para preparar certificaciones profesionales.',
  'Lo unico malo es que se me hizo corto. Quiero mas.',
];

const titulosForo = [
  '¿Como resolver este error en la instalacion?',
  'Comparto mi proyecto final del modulo 3',
  'Duda sobre el ejercicio de la semana 4',
  '¿Alguien mas tuvo problemas con la configuracion?',
  'Recomendacion de recursos adicionales',
  'Resumen de los conceptos clave del modulo 2',
  '¿Este curso prepara para la certificacion?',
  'Consejos para el examen final',
  'Grupo de estudio para el proyecto integrador',
  '¿Que IDE recomiendan para este curso?',
  'Error en el codigo del ejemplo 5',
  'Material complementario que encontre util',
  '¿Como aplican esto en su trabajo diario?',
  'Feedback del modulo 1: muy buen contenido',
  'Duda sobre la fecha de entrega del proyecto',
];

const contenidosForo = [
  'Hola a todos. Estoy teniendo este problema al ejecutar el codigo del ejemplo. ¿Alguien sabe como solucionarlo?',
  'Les comparto el link a mi repositorio con el proyecto final. Acepto sugerencias y criticas constructivas.',
  'No me queda claro el concepto explicado en el minuto 15 del video. ¿Podrian explicarlo de otra forma?',
  'He intentado varias configuraciones pero ninguna funciona. Adjunto captura del error.',
  'Encontre este articulo que complementa muy bien lo visto en clase. Se los recomiendo.',
  'Hice un resumen de los puntos mas importantes del modulo. Espero les sea util.',
  '¿Saben si este curso es suficiente para presentar el examen de certificacion oficial?',
  '¿Alguien quiere formar un grupo de estudio por Zoom? Podemos reunirnos los sabados.',
];

// ─── Lectura de datos desde PostgreSQL ─────────────────────────
async function leerDatosPG() {
  console.log('Leyendo datos de PostgreSQL...');

  const [inscRes, leccRes, estRes, cursosRes, pregRes, modRes, instrRes] = await Promise.all([
    pg.query('SELECT id, estudiante_id, curso_id, estado, fecha_inscripcion FROM inscripciones'),
    pg.query('SELECT l.id, l.modulo_id, l.tipo, l.duracion_minutos FROM lecciones l'),
    pg.query('SELECT id, usuario_id FROM estudiantes'),
    pg.query("SELECT id, instructor_id FROM cursos WHERE estado = 'publicado'"),
    pg.query('SELECT id, leccion_id, texto, respuesta_correcta, opciones, tipo, puntos FROM preguntas'),
    pg.query('SELECT id, curso_id, orden FROM modulos'),
    pg.query('SELECT id, usuario_id FROM instructores'),
  ]);

  return {
    inscripciones: inscRes.rows,
    lecciones: leccRes.rows,
    estudiantes: estRes.rows,
    cursosPublicados: cursosRes.rows,
    preguntas: pregRes.rows,
    modulos: modRes.rows,
    instructores: instrRes.rows,
  };
}

function buildCursoLecciones(data) {
  const map = {};
  for (const m of data.modulos) {
    if (!map[m.curso_id]) map[m.curso_id] = [];
  }
  for (const l of data.lecciones) {
    const mod = data.modulos.find(m => m.id === l.modulo_id);
    if (mod) {
      if (!map[mod.curso_id]) map[mod.curso_id] = [];
      map[mod.curso_id].push(l);
    }
  }
  return map;
}

// ─── MAIN ───────────────────────────────────────────────────────
async function main() {
  console.log('Conectando a PostgreSQL...');
  await pg.query('SELECT 1');
  console.log('[PG] OK');

  console.log('Conectando a MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log('[Mongo] OK');

  const data = await leerDatosPG();
  const cursoLecciones = buildCursoLecciones(data);

  const estudianteIds = data.estudiantes.map(e => e.id);
  const usuarioIdsMap = {};
  data.estudiantes.forEach(e => { usuarioIdsMap[e.id] = e.usuario_id; });
  const instructorUsuarioMap = {};
  data.instructores.forEach(i => { instructorUsuarioMap[i.id] = i.usuario_id; });

  // ═══ 1. progreso_lecciones ═══════════════════════════════════
  console.log('\n─── 1/5 progreso_lecciones ───');
  await db.collection('progreso_lecciones').deleteMany({});
  let totalProgreso = 0;

  for (const ins of data.inscripciones) {
    const lecciones = cursoLecciones[ins.curso_id] || [];
    if (lecciones.length === 0) continue;

    const progresoArr = lecciones.map(l => {
      const completada = Math.random() < 0.60;
      return {
        leccion_id: uuidToBin(l.id),
        completada,
        porcentaje_visto: completada ? 100 : rand(10, 90),
        tiempo_dedicado_seg: completada ? rand(120, 1800) : rand(30, 300),
        fecha_inicio: randomDate(ins.fecha_inscripcion, 180),
        fecha_completada: completada ? randomDate(ins.fecha_inscripcion, 210) : null,
      };
    });

    const completadas = progresoArr.filter(p => p.completada).length;
    const ultima = [...progresoArr].sort((a, b) =>
      new Date(b.fecha_inicio) - new Date(a.fecha_inicio))[0];

    await db.collection('progreso_lecciones').insertOne({
      inscripcion_id: uuidToBin(ins.id),
      curso_id: uuidToBin(ins.curso_id),
      estudiante_id: uuidToBin(ins.estudiante_id),
      progreso_lecciones: progresoArr,
      ultima_leccion_vista: ultima.leccion_id,
      porcentaje_total: Math.round((completadas / lecciones.length) * 10000) / 100,
      fecha_ultima_actividad: randomDate(ins.fecha_inscripcion, 365),
      fecha_inscripcion: new Date(ins.fecha_inscripcion),
    });
    totalProgreso += lecciones.length;
  }
  const countProg = await db.collection('progreso_lecciones').countDocuments();
  console.log(`  ${countProg} docs, ~${totalProgreso} entries de progreso`);

  // ═══ 2. resenas ═══════════════════════════════════════════════
  console.log('\n─── 2/5 resenas ───');
  await db.collection('resenas').deleteMany({});
  const completadas = data.inscripciones.filter(i => i.estado === 'completado');
  const limitRes = Math.min(completadas.length, 200);

  for (let i = 0; i < limitRes; i++) {
    const ins = completadas[i];
    const curso = data.cursosPublicados.find(c => c.id === ins.curso_id);
    const instructorUsuarioId = curso ? instructorUsuarioMap[curso.instructor_id] : null;

    const califs = [rand(1, 5), rand(1, 5), rand(1, 5), rand(1, 5), rand(1, 5)];
    const promedio = Math.round((califs.reduce((a, b) => a + b, 0) / 5) * 10) / 10;

    await db.collection('resenas').insertOne({
      inscripcion_id: uuidToBin(ins.id),
      curso_id: uuidToBin(ins.curso_id),
      estudiante_id: uuidToBin(ins.estudiante_id),
      instructor_id: instructorUsuarioId ? uuidToBin(instructorUsuarioId) : null,
      calif_contenido: califs[0],
      calif_claridad: califs[1],
      calif_dificultad: califs[2],
      calif_valor: califs[3],
      calif_instructor: califs[4],
      calificacion_promedio: promedio,
      comentario: pick(comentariosList),
      titulo_resena: pick(['Excelente curso', 'Muy bueno', 'Recomendado', 'Buen contenido', 'Vale la pena', 'Increible', 'Bien estructurado', 'Practico y util']),
      fecha_resena: randomDate(ins.fecha_inscripcion, 90),
      editada: false,
      fecha_edicion: null,
      aprobada: Math.random() < 0.90,
      util_count: rand(0, 25),
      reportada: Math.random() < 0.05,
    });
  }
  const countRes = await db.collection('resenas').countDocuments();
  console.log(`  ${countRes} docs`);

  // ═══ 3. cuestionarios_respuestas ══════════════════════════════
  console.log('\n─── 3/5 cuestionarios_respuestas ───');
  await db.collection('cuestionarios_respuestas').deleteMany({});
  const lecCuestionario = data.lecciones.filter(l => l.tipo === 'cuestionario');

  for (let i = 0; i < 800; i++) {
    const estId = pick(estudianteIds);
    const lec = pick(lecCuestionario);
    const preguntas = data.preguntas.filter(p => p.leccion_id === lec.id);
    if (preguntas.length === 0) continue;

    const respuestas = preguntas.map(p => {
      const correcta = Math.random() < 0.65;
      let respuesta;
      if (correcta) {
        respuesta = p.respuesta_correcta;
      } else if (p.opciones && Array.isArray(p.opciones) && p.opciones.length > 0) {
        respuesta = pick(p.opciones.filter(o => o !== p.respuesta_correcta)) || 'Respuesta incorrecta';
      } else {
        respuesta = p.respuesta_correcta === 'Verdadero' ? 'Falso' : 'Verdadero';
      }
      return { pregunta_id: uuidToBin(p.id), respuesta, correcta };
    });

    const correctas = respuestas.filter(r => r.correcta).length;
    const puntaje = preguntas.filter((p, idx) => respuestas[idx].correcta)
      .reduce((acc, p) => acc + (p.puntos || 1), 0);

    const inscDelEst = data.inscripciones.filter(ins => ins.estudiante_id === estId);
    const fechaBase = inscDelEst.length > 0 ? inscDelEst[0].fecha_inscripcion : new Date('2025-06-01');

    await db.collection('cuestionarios_respuestas').insertOne({
      estudiante_id: uuidToBin(estId),
      leccion_id: uuidToBin(lec.id),
      preguntas_respuestas: respuestas,
      calificacion: Math.round((correctas / preguntas.length) * 100),
      puntaje_total: puntaje,
      tiempo_total_seg: rand(60, 1200),
      fecha_intento: randomDate(fechaBase, 300),
      intento_numero: 1,
    });
  }
  const countQuiz = await db.collection('cuestionarios_respuestas').countDocuments();
  console.log(`  ${countQuiz} docs`);

  // ═══ 4. logs_actividad ════════════════════════════════════════
  console.log('\n─── 4/5 logs_actividad ───');
  await db.collection('logs_actividad').deleteMany({});
  const logs = [];

  for (const ins of data.inscripciones) {
    const usuarioId = usuarioIdsMap[ins.estudiante_id];
    if (!usuarioId) continue;

    logs.push({
      usuario_id: uuidToBin(usuarioId),
      tipo_evento: 'inscripcion_realizada',
      timestamp: new Date(ins.fecha_inscripcion),
      metadata: { curso_id: uuidToBin(ins.curso_id), inscripcion_id: uuidToBin(ins.id) },
    });

    const lecciones = cursoLecciones[ins.curso_id] || [];
    for (const l of lecciones) {
      logs.push({
        usuario_id: uuidToBin(usuarioId),
        tipo_evento: 'leccion_iniciada',
        timestamp: randomDate(ins.fecha_inscripcion, 300),
        metadata: { curso_id: uuidToBin(ins.curso_id), leccion_id: uuidToBin(l.id), inscripcion_id: uuidToBin(ins.id) },
      });
      if (Math.random() < 0.60) {
        logs.push({
          usuario_id: uuidToBin(usuarioId),
          tipo_evento: 'leccion_completada',
          timestamp: randomDate(ins.fecha_inscripcion, 310),
          metadata: { curso_id: uuidToBin(ins.curso_id), leccion_id: uuidToBin(l.id), inscripcion_id: uuidToBin(ins.id) },
        });
      }
    }

    for (let li = 0; li < rand(1, 3); li++) {
      logs.push({
        usuario_id: uuidToBin(usuarioId),
        tipo_evento: 'login',
        timestamp: randomDate(ins.fecha_inscripcion, 365),
        metadata: { ip_origen: `192.168.${rand(1, 255)}.${rand(1, 255)}` },
      });
    }
  }

  for (let i = 0; i < 500; i++) {
    const estId = pick(estudianteIds);
    const usuarioId = usuarioIdsMap[estId];
    if (!usuarioId) continue;
    logs.push({
      usuario_id: uuidToBin(usuarioId),
      tipo_evento: 'login',
      timestamp: randomDate('2025-06-01', 365),
      metadata: { ip_origen: `192.168.${rand(1, 255)}.${rand(1, 255)}` },
    });
    if (Math.random() < 0.5) {
      logs.push({
        usuario_id: uuidToBin(usuarioId),
        tipo_evento: 'logout',
        timestamp: randomDate('2025-06-01', 365),
      });
    }
  }

  await db.collection('logs_actividad').insertMany(logs);
  const countLogs = await db.collection('logs_actividad').countDocuments();
  console.log(`  ${countLogs} docs`);

  // ═══ 5. foros ═════════════════════════════════════════════════
  console.log('\n─── 5/5 foros ───');
  await db.collection('foros').deleteMany({});
  const hilosRaiz = [];

  for (let i = 0; i < 100; i++) {
    const curso = pick(data.cursosPublicados);
    const estId = pick(estudianteIds);
    const doc = {
      curso_id: uuidToBin(curso.id),
      estudiante_id: uuidToBin(estId),
      titulo: pick(titulosForo),
      contenido: pick(contenidosForo),
      parent_id: null,
      ancestro_raiz_id: null,
      profundidad: 0,
      likes_count: rand(0, 15),
      likes_usuarios: [],
      editado: false,
      fecha_creacion: randomDate('2025-10-01', 240),
      fecha_modificacion: null,
      resuelto: Math.random() < 0.15,
      reportado: Math.random() < 0.03,
    };
    const result = await db.collection('foros').insertOne(doc);
    hilosRaiz.push({ _id: result.insertedId, curso_id: curso.id, fecha_creacion: doc.fecha_creacion });
  }

  for (let i = 0; i < 200; i++) {
    const hilo = pick(hilosRaiz);
    let estId;
    do {
      estId = pick(estudianteIds);
    } while (hilosRaiz.some(h => h.estudiante_id === estId)); // evitar mismo autor
    await db.collection('foros').insertOne({
      curso_id: hilo.curso_id,
      estudiante_id: uuidToBin(estId),
      titulo: null,
      contenido: pick(contenidosForo),
      parent_id: hilo._id,
      ancestro_raiz_id: hilo._id,
      profundidad: 1,
      likes_count: rand(0, 5),
      likes_usuarios: [],
      editado: false,
      fecha_creacion: randomDateBetween(hilo.fecha_creacion, new Date()),
      fecha_modificacion: null,
      resuelto: Math.random() < 0.10,
      reportado: Math.random() < 0.03,
    });
  }
  const countForos = await db.collection('foros').countDocuments();
  const countRaiz = await db.collection('foros').countDocuments({ parent_id: null });
  const countResp = await db.collection('foros').countDocuments({ parent_id: { $ne: null } });
  console.log(`  ${countForos} docs (${countRaiz} hilos + ${countResp} respuestas)`);

  // ─── Resumen final ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(' SEED COMPLETADO');
  console.log('═══════════════════════════════════════');
  console.log(`  progreso_lecciones:        ${countProg} docs (~${totalProgreso} entries)`);
  console.log(`  resenas:                   ${countRes} docs`);
  console.log(`  cuestionarios_respuestas:  ${countQuiz} docs`);
  console.log(`  logs_actividad:            ${countLogs} docs`);
  console.log(`  foros:                     ${countForos} docs (${countRaiz} hilos)`);
  console.log('═══════════════════════════════════════');

  await pg.end();
  await mongoose.disconnect();
  console.log('Conexiones cerradas.');
}

main().catch(err => { console.error('FATAL:', err.message); pg.end(); mongoose.disconnect(); process.exit(1); });
