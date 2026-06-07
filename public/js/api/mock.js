/**
 * Mock API Handler — Alineado con backend real + datos demo.
 * Backend paths: /api/cursos, /api/modulos, /api/lecciones, etc.
 */
import {
  courses, modules, reviews, cart,
  addToCartMock, removeFromCartMock, clearCartMock,
  enrollments, certificates,
  instructorCourses, instructorEarnings,
  students,
} from './mock-data.js';

export function handleMock(method, path, body) {
  const delay = () => new Promise(r => setTimeout(r, 100 + Math.random() * 200));

  const handlers = {
    // ─── Auth ───────────────────────────────────────
    'POST /auth/registro': async () => {
      const { nombre, apellido, email, password, rol } = body || {};
      const id = 'u' + (Object.keys(students).length + 1);
      students[id] = { id, nombre: nombre + (apellido ? ' ' + apellido : ''), email, rol: rol || 'estudiante' };
      return { data: { token: 'demo-jwt-' + id, usuario: students[id] } };
    },
    'POST /auth/login': async () => {
      const { email } = body || {};
      const user = Object.values(students).find(u => u.email === email);
      if (!user) return { status: 401, data: { error: 'Credenciales inválidas' } };
      return { data: { token: 'demo-jwt-' + user.id, usuario: user } };
    },
    'GET /auth/yo': async () => {
      // En mock, devuelve el primer estudiante como usuario autenticado
      const userId = 'u1';
      return { data: students[userId] || null };
    },

    // ─── Cursos (catálogo + instructor) ─────────────
    'GET /cursos': async (path) => {
      const url = new URL('http://x' + path);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = 6;
      const instructorId = url.searchParams.get('instructor_id');

      if (instructorId) {
        return { data: { cursos: instructorCourses, ...instructorEarnings } };
      }

      let filtered = courses;
      const start = (page - 1) * limit;
      return { data: { cursos: filtered.slice(start, start + limit), page, total_pages: Math.ceil(filtered.length / limit), total: filtered.length } };
    },
    'GET /cursos/:id': async (path) => {
      const id = path.split('/').pop();
      const course = courses.find(c => c.id === id || c.slug === id);
      return course ? { data: course } : { status: 404, data: { error: 'Curso no encontrado' } };
    },

    // ─── Módulos ─────────────────────────────────────
    'GET /modulos': async (path) => {
      const url = new URL('http://x' + path);
      const cursoId = url.searchParams.get('curso_id');
      if (cursoId) return { data: modules[cursoId] || [] };
      const all = Object.entries(modules).flatMap(([cid, mods]) => mods.map(m => ({ ...m, curso_id: cid })));
      return { data: all };
    },

    // ─── Lecciones ───────────────────────────────────
    'GET /lecciones': async (path) => {
      const url = new URL('http://x' + path);
      const moduloId = url.searchParams.get('modulo_id');
      if (moduloId) {
        for (const mods of Object.values(modules)) {
          const found = mods.find(m => m.id === moduloId);
          if (found) return { data: found.lecciones || [] };
        }
        return { data: [] };
      }
      const allLecciones = [];
      for (const mods of Object.values(modules)) {
        for (const m of mods) {
          for (const l of (m.lecciones || [])) allLecciones.push(l);
        }
      }
      return { data: allLecciones };
    },
    'GET /lecciones/:id': async (path) => {
      const id = path.split('/').pop();
      for (const mods of Object.values(modules)) {
        for (const m of mods) {
          const found = (m.lecciones || []).find(l => l.id === id);
          if (found) return { data: { ...found, modulo_orden: m.orden } };
        }
      }
      return { status: 404, data: { error: 'Lección no encontrada' } };
    },

    // ─── Reseñas (mock-only) ─────────────────────────
    'GET /cursos/:id/resenas': async (path) => {
      const parts = path.split('/');
      const cursoId = parts[2];
      const course = courses.find(c => c.id === cursoId || c.slug === cursoId);
      return { data: course ? (reviews[course.id] || []) : [] };
    },

    // ─── Carrito (mock-only) ─────────────────────────
    'GET /carrito': async () => { const t = cart.reduce((s, i) => s + (i.precio || 0), 0); return { data: { items: cart, total: t } }; },
    'POST /carrito': async () => {
      const { curso_id } = body || {};
      const course = courses.find(c => c.id === curso_id || c.slug === curso_id);
      if (!course) return { status: 404, data: { error: 'Curso no encontrado' } };
      return { data: addToCartMock(course.slug) };
    },
    'DELETE /carrito/:id': async (path) => { removeFromCartMock(path.split('/').pop()); return { data: { message: 'Eliminado' } }; },

    // ─── Inscripciones ──────────────────────────────
    'GET /estudiantes/:id/cursos': async () => {
      return { data: { cursos: enrollments } };
    },
    'GET /estudiantes/:id/cursos/:cid/avance': async (path) => {
      const cid = path.split('/')[4];
      const e = enrollments.find(en => en.curso_id === cid);
      return { data: { avance: e?.porcentaje_avance || 0 } };
    },
    'POST /inscripciones': async () => {
      const { curso_id } = body || {};
      const course = courses.find(c => c.id === curso_id);
      if (!course) return { status: 404, data: { error: 'Curso no encontrado' } };
      const exists = enrollments.find(e => e.curso_id === curso_id);
      if (exists) return { data: { message: 'Ya inscrito' } };
      enrollments.push({ id: 'en' + (enrollments.length + 1), curso_id: course.id, slug: course.slug, titulo: course.titulo, instructor: course.instructor, imagen_url: '', porcentaje_avance: 0, lecciones_completadas: 0, total_lecciones: course.total_lecciones });
      clearCartMock();
      return { data: { message: 'Inscrito exitosamente' } };
    },

    // ─── Certificados ───────────────────────────────
    'GET /certificados': async () => ({ data: { certificados: certificates } }),
    'GET /certificados/:id': async (path) => {
      const id = path.split('/').pop();
      const cert = certificates.find(c => c.id === id || c.codigo === id);
      return cert ? { data: cert } : { status: 404, data: { error: 'No encontrado' } };
    },
    'POST /certificados': async () => {
      return { data: { id: 'cert-new', codigo: 'EDU-NEW-001', fecha_emision: new Date().toISOString() } };
    },

    // ─── Progreso (mock-only) ────────────────────────
    'POST /progreso': async () => {
      const { leccion_id, completada } = body || {};
      for (const mods of Object.values(modules)) {
        for (const m of mods) {
          const l = (m.lecciones || []).find(ls => ls.id === leccion_id);
          if (l) { l.completada = completada !== false; return { data: { message: 'Progreso guardado' } }; }
        }
      }
      return { data: { message: 'Progreso guardado' } };
    },

    // ─── Instructor ─────────────────────────────────
    'GET /instructores/:id/ingresos': async () => {
      return { data: instructorEarnings };
    },
    'GET /instructores': async () => {
      return { data: [{ id: 'i1', nombre: 'Dra. Sarah Jenkins', usuario_id: 'u2', biografia: 'Experta en React', anos_experiencia: 8 }] };
    },

    // ─── Categorías ─────────────────────────────────
    'GET /categorias': async () => {
      const cats = [...new Set(courses.map(c => c.categoria))].map((nombre, i) => ({ id: i + 1, nombre, slug: nombre.toLowerCase().replace(/\s+/g, '-') }));
      return { data: cats };
    },
  };

  const routeKey = `${method} ${path}`;
  let handler = handlers[routeKey];

  if (!handler) {
    for (const [pattern, fn] of Object.entries(handlers)) {
      if (pattern.includes(':')) {
        const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
        if (regex.test(routeKey)) { handler = fn; break; }
      }
    }
  }

  if (!handler) {
    return delay().then(() => ({ status: 404, data: { error: `Mock: sin handler para ${method} ${path}` } }));
  }

  return delay().then(() => handler(path));
}
