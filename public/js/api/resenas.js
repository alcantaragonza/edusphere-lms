/**
 * Reseñas API (MongoDB).
 */
import { api } from './client.js';

export async function getReviews(courseSlug, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/cursos/${courseSlug}/resenas${qs ? '?' + qs : ''}`);
}

export async function createReview(courseSlug, data) {
  return api.post(`/cursos/${courseSlug}/resenas`, data);
}
