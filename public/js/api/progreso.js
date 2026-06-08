/**
 * Progreso API — Backend: GET/POST /api/progreso (MongoDB)
 */
import { api } from './client.js';

export async function saveProgress(data) {
  return api.post('/progreso', data);
}

export async function getProgress() {
  return api.get('/progreso');
}

export async function getProgressById(id) {
  return api.get(`/progreso/${id}`);
}
