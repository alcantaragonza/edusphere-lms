/**
 * Inscripciones API — Backend: /inscripciones, /estudiantes/:id/cursos.
 */
import { api } from './client.js';
import { state } from '../utils/state.js';

export async function enroll(cursoId) {
  const userId = localStorage.getItem('edusphere_user_id');
  return api.post('/inscripciones', {
    estudiante_id: userId,
    curso_id: cursoId,
  });
}

export async function getMyCourses() {
  const userId = localStorage.getItem('edusphere_user_id');
  if (!userId) return { cursos: [] };
  return api.get(`/estudiantes/${userId}/cursos`);
}

export async function getCourseProgress(cursoId) {
  const userId = localStorage.getItem('edusphere_user_id');
  if (!userId) return { avance: 0 };
  return api.get(`/estudiantes/${userId}/cursos/${cursoId}/avance`);
}
