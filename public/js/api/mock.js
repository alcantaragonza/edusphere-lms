/**
 * Mock API Handler — Simulates all API endpoints for demo mode.
 * Activated automatically when the real API is unreachable.
 */
import {
  courses, modules, reviews, cart,
  addToCartMock, removeFromCartMock, clearCartMock,
  enrollments, certificates,
  instructorCourses, instructorEarnings,
  students,
} from './mock-data.js';

/**
 * Route a mock API call based on method + path.
 * Returns { data, error } — mimics fetch response.
 */
export function handleMock(method, path, body) {
  // Simulate network delay
  const delay = () => new Promise(r => setTimeout(r, 150 + Math.random() * 300));

  const handlers = {
    // ─── Auth ───────────────────────────────────────
    'POST /auth/login': async () => {
      const { email } = body || {};
      // Find matching demo user
      const user = Object.values(students).find(u => u.email === email);
      if (!user) return { status: 401, data: { error: 'Invalid credentials' } };
      return {
        data: { token: 'mock-jwt-token', user, cart_count: cart.length },
      };
    },
    'POST /auth/register': async () => {
      const { nombre, email, rol } = body || {};
      const id = 'u' + (Object.keys(students).length + 1);
      students[id] = { id, nombre, email, rol: rol || 'estudiante' };
      return { data: { message: 'User created', user: students[id] } };
    },
    'GET /auth/me': async () => {
      return { data: students['u1'] };
    },

    // ─── Courses Catalog ────────────────────────────
    'GET /cursos': async (path) => {
      const url = new URL('http://x' + path);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = 6;
      const start = (page - 1) * limit;
      return {
        data: {
          cursos: courses.slice(start, start + limit),
          page,
          total_pages: Math.ceil(courses.length / limit),
          total: courses.length,
        }
      };
    },

    // ─── Course Detail ──────────────────────────────
    'GET /cursos/:slug': async (path) => {
      const slug = path.split('/').pop();
      const course = courses.find(c => c.slug === slug);
      if (!course) return { status: 404, data: { error: 'Course not found' } };
      return { data: course };
    },

    // ─── Course Modules ─────────────────────────────
    'GET /cursos/:slug/modulos': async (path) => {
      const parts = path.split('/');
      const slug = parts[2];
      const course = courses.find(c => c.slug === slug);
      if (!course) return { status: 404, data: { error: 'Course not found' } };
      return { data: modules[course.id] || [] };
    },

    // ─── Course Lessons ─────────────────────────────
    'GET /cursos/:slug/lecciones/:lessonId': async (path) => {
      const parts = path.split('/');
      const slug = parts[2];
      const lessonId = parts[4];
      const course = courses.find(c => c.slug === slug);
      if (!course) return { status: 404, data: { error: 'Course not found' } };
      const mods = modules[course.id] || [];
      for (const m of mods) {
        const lesson = m.lecciones?.find(l => l.id === lessonId);
        if (lesson) return { data: { ...lesson, modulo_orden: m.orden } };
      }
      return { status: 404, data: { error: 'Lesson not found' } };
    },

    // ─── Reviews ────────────────────────────────────
    'GET /cursos/:slug/resenas': async (path) => {
      const parts = path.split('/');
      const slug = parts[2];
      const course = courses.find(c => c.slug === slug);
      if (!course) return { data: { resenas: [] } };
      return { data: { resenas: reviews[course.id] || [] } };
    },
    'POST /cursos/:slug/resenas': async (path) => {
      const parts = path.split('/');
      const slug = parts[2];
      const { calificacion, comentario } = body || {};
      return {
        data: {
          id: 'r-new',
          usuario_nombre: 'You',
          calificacion,
          comentario,
          created_at: new Date().toISOString(),
        }
      };
    },

    // ─── Cart ───────────────────────────────────────
    'GET /carrito': async () => {
      const total = cart.reduce((s, i) => s + (i.precio || 0), 0);
      return { data: { items: cart, total } };
    },
    'POST /carrito': async () => {
      const { curso_id } = body || {};
      const course = courses.find(c => c.slug === curso_id || c.id === curso_id);
      if (!course) return { status: 404, data: { error: 'Course not found' } };
      const item = addToCartMock(course.slug);
      return { data: item };
    },
    'DELETE /carrito/:id': async (path) => {
      const itemId = path.split('/').pop();
      removeFromCartMock(itemId);
      return { data: { message: 'Removed' } };
    },

    // ─── Enrollments / My Courses ───────────────────
    'GET /inscripciones/mis-cursos': async () => {
      return { data: { cursos: enrollments } };
    },
    'GET /inscripciones/:id/avance': async (path) => {
      const cursoId = path.split('/')[2];
      const enrollment = enrollments.find(e => e.curso_id === cursoId);
      return { data: { avance: enrollment?.porcentaje_avance || 0 } };
    },
    'POST /inscripciones': async () => {
      const { curso_id } = body || {};
      const course = courses.find(c => c.id === curso_id);
      if (!course) return { status: 404, data: { error: 'Course not found' } };
      const exists = enrollments.find(e => e.curso_id === curso_id);
      if (exists) return { data: { message: 'Already enrolled' } };
      enrollments.push({
        id: 'en' + (enrollments.length + 1),
        curso_id: course.id,
        slug: course.slug,
        titulo: course.titulo,
        instructor: course.instructor,
        imagen_url: course.imagen_url,
        porcentaje_avance: 0,
        lecciones_completadas: 0,
        total_lecciones: course.total_lecciones,
      });
      clearCartMock();
      return { data: { message: 'Enrolled successfully' } };
    },

    // ─── Certificates ───────────────────────────────
    'GET /certificados': async () => {
      return { data: { certificados: certificates } };
    },
    'GET /certificados/:id': async (path) => {
      const id = path.split('/').pop();
      const cert = certificates.find(c => c.id === id || c.codigo === id);
      if (!cert) return { status: 404, data: { error: 'Certificate not found' } };
      return { data: cert };
    },
    'GET /certificados/verificar/:code': async (path) => {
      const code = path.split('/').pop();
      const cert = certificates.find(c => c.codigo === code);
      if (!cert) return { status: 404, data: { error: 'Invalid certificate code' } };
      return { data: { valid: true, certificate: cert } };
    },

    // ─── Progress ───────────────────────────────────
    'POST /progreso': async () => {
      const { leccion_id, completada } = body || {};
      // Find the lesson in modules and mark it
      for (const [cid, mods] of Object.entries(modules)) {
        for (const m of mods) {
          const lesson = m.lecciones?.find(l => l.id === leccion_id);
          if (lesson) {
            lesson.completada = completada !== false;
            return { data: { message: 'Progress saved' } };
          }
        }
      }
      return { data: { message: 'Progress saved' } };
    },
    'GET /progreso/:id': async () => {
      return { data: { completada: false, tiempo_visto: 0 } };
    },

    // ─── Instructor ─────────────────────────────────
    'GET /instructor/cursos': async () => {
      return { data: { cursos: instructorCourses, ...instructorEarnings } };
    },
  };

  // Match route
  const routeKey = `${method} ${path}`;
  let handler = handlers[routeKey];

  // Try parameterized routes
  if (!handler) {
    for (const [pattern, fn] of Object.entries(handlers)) {
      if (pattern.includes(':')) {
        const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
        if (regex.test(routeKey)) {
          handler = fn;
          break;
        }
      }
    }
  }

  if (!handler) {
    return delay().then(() => ({
      status: 404,
      data: { error: `Mock: No handler for ${method} ${path}` },
    }));
  }

  return delay().then(() => handler(path));
}
