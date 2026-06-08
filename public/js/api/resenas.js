/**
 * Reseñas API — No existe en backend. Mock-only.
 */
import { api } from './client.js';

export async function getReviews(courseId) {
  return api.get(`/cursos/${courseId}/resenas`);
}

export async function createReview(courseId, data) {
  return api.post(`/cursos/${courseId}/resenas`, data);
}
