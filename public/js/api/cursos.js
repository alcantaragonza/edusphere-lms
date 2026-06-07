/**
 * Cursos API — Backend: /cursos, /modulos, /lecciones, /categorias.
 */
import { api } from './client.js';

export async function getCatalog(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/cursos${qs ? '?' + qs : ''}`);
}

export async function getCourseById(id) {
  return api.get(`/cursos/${id}`);
}

export async function getCourseModules(cursoId) {
  return api.get(`/modulos?curso_id=${cursoId}`);
}

export async function getModuleLessons(moduloId) {
  return api.get(`/lecciones?modulo_id=${moduloId}`);
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
