/**
 * Auth API — Backend: POST /auth/registro, POST /auth/login, GET /auth/yo.
 * Token JWT via Bearer, guardado automáticamente en localStorage.
 */
import { api } from './client.js';

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  if (res.token) {
    localStorage.setItem('edusphere_token', res.token);
    if (res.usuario?.id) localStorage.setItem('edusphere_user_id', res.usuario.id);
  }
  return res;
}

export async function register(data) {
  const res = await api.post('/auth/registro', {
    nombre: data.nombre,
    apellido: data.apellido || '',
    email: data.email,
    password: data.password,
    telefono: data.telefono || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    rol: data.rol || 'estudiante',
  });
  if (res.token) {
    localStorage.setItem('edusphere_token', res.token);
    if (res.usuario?.id) localStorage.setItem('edusphere_user_id', res.usuario.id);
  }
  return res;
}

export async function me() {
  return api.get('/auth/yo');
}
