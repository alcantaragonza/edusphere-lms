/**
 * Inscripciones API — Enroll, my courses, progress.
 */
import { api } from './client.js';

export async function enroll(courseId) {
  return api.post('/inscripciones', { curso_id: courseId });
}

export async function getMyCourses() {
  return api.get('/inscripciones/mis-cursos');
}

export async function getCourseProgress(courseId) {
  return api.get(`/inscripciones/${courseId}/avance`);
}
