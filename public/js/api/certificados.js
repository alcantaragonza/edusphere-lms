/**
 * Certificados API — Backend: POST /certificados (emitir).
 * Listado no disponible, se usa mock.
 */
import { api } from './client.js';

export async function getCertificates() {
  try {
    return await api.get('/certificados');
  } catch (_) {
    return [];
  }
}

export async function emitCertificate(inscripcionId) {
  return api.post('/certificados', { inscripcion_id: inscripcionId });
}

export async function getCertificate(id) {
  return api.get(`/certificados/${id}`);
}
