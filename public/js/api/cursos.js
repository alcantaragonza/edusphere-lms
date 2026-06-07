/**
 * Cursos API — Catalog, detail, modules/lessons.
 */
import { api } from './client.js';

export async function getCatalog(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/cursos${qs ? '?' + qs : ''}`);
}

export async function getCourseBySlug(slug) {
  return api.get(`/cursos/${slug}`);
}

export async function getCourseModules(slug) {
  return api.get(`/cursos/${slug}/modulos`);
}

export async function getCourseLessons(slug) {
  return api.get(`/cursos/${slug}/lecciones`);
}

export async function getLesson(slug, lessonId) {
  return api.get(`/cursos/${slug}/lecciones/${lessonId}`);
}

export async function getInstructorCourses() {
  return api.get('/instructor/cursos');
}
