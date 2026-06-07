/**
 * Certificados API.
 */
import { api } from './client.js';

export async function getCertificates() {
  return api.get('/certificados');
}

export async function getCertificate(id) {
  return api.get(`/certificados/${id}`);
}

export async function verifyCertificate(code) {
  return api.get(`/certificados/verificar/${code}`);
}
