/**
 * Certificados API — Backend: POST /certificados (emitir).
 * Listado no disponible, se usa mock.
 */
import { api } from './client.js';

export async function getCertificates() {
  // Backend no tiene GET /certificados — cae en mock
  return api.get('/certificados');
}

export async function emitCertificate(inscripcionId) {
  return api.post('/certificados', { inscripcion_id: inscripcionId });
}

export async function getCertificate(id) {
  return api.get(`/certificados/${id}`);
}
