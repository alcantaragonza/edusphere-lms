/**
 * Progreso API — Backend solo tiene RC-03 (consulta). Guardado es mock.
 */
import { api } from './client.js';

export async function saveProgress(lessonId, data) {
  return api.post('/progreso', { leccion_id: lessonId, ...data });
}

export async function getLessonProgress(lessonId) {
  return api.get(`/progreso/${lessonId}`);
}
