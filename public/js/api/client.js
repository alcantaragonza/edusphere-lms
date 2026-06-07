/**
 * HTTP Client — Backend real (sin mock).
 * Backend: Express 5 + PostgreSQL (edusphere-lms-production.up.railway.app)
 */

const API_BASE = 'https://edusphere-lms-production.up.railway.app/api';

function getToken() {
  return localStorage.getItem('edusphere_token');
}

async function request(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const text = await res.text();
  let data = null;

  if (isJson && text) {
    try { data = JSON.parse(text); } catch (_) { data = null; }
  }

  if (!res.ok) {
    const error = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data || {};
}

export const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, body) => request('POST', endpoint, body),
  put: (endpoint, body) => request('PUT', endpoint, body),
  patch: (endpoint, body) => request('PATCH', endpoint, body),
  delete: (endpoint) => request('DELETE', endpoint),
};
