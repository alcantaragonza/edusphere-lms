/**
 * Cursos API — Backend: /cursos, /modulos, /lecciones, /categorias.
 */
import { api } from './client.js';

async function fetchAll(endpoint, perPage = 200) {
  const results = [];
  let offset = 0;
  while (true) {
    const data = await api.get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${perPage}&offset=${offset}`);
    const batch = Array.isArray(data) ? data : (data.data || []);
    results.push(...batch);
    if (batch.length < perPage) break;
    offset += perPage;
  }
  return results;
}

export async function getCatalog(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/cursos${qs ? '?' + qs : ''}`);
}

export async function getCourseById(id) {
  return api.get(`/cursos/${id}`);
}

export async function getCourseModules(cursoId) {
  return fetchAll('/modulos');
}

export async function getModuleLessons(moduloId) {
  return fetchAll('/lecciones');
}

export async function getLesson(lessonId) {
  return api.get(`/lecciones/${lessonId}`);
}

export async function getCategories() {
  return api.get('/categorias');
}

export async function getInstructorCourses(instructorId) {
  return api.get(`/cursos?instructor_id=${instructorId}`);
}
