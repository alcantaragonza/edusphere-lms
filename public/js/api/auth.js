/**
 * Auth API — Login, Register, Me.
 */
import { api } from './client.js';

export async function login(email, password) {
  return api.post('/auth/login', { email, password });
}

export async function register(data) {
  return api.post('/auth/register', data);
}

export async function me() {
  return api.get('/auth/me');
}
