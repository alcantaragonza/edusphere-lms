/**
 * HTTP Client — Fetch wrapper con auth y fallback automático a mock.
 * Backend: Express 5 + PostgreSQL (edusphere-lms-production.up.railway.app)
 */
import { handleMock } from './mock.js';

const API_BASE = 'https://edusphere-lms-production.up.railway.app/api';

let apiAvailable = null;

function getToken() {
  return localStorage.getItem('edusphere_token');
}

async function request(method, endpoint, body = null) {
  if (apiAvailable === false) {
    return mockRequest(method, endpoint, body);
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const text = await res.text();
    let data = null;

    if (isJson && text) {
      try { data = JSON.parse(text); } catch (_) { data = null; }
    }

    // Non-JSON response → API unreachable, use mocks
    if (!isJson && !res.ok) {
      apiAvailable = false;
      console.log('[EduSphere] API no disponible (respuesta no-JSON), usando datos demo');
      return mockRequest(method, endpoint, body);
    }

    // Empty response = OK but no data yet (backend works, just empty)
    if ((res.status === 200 || res.status === 201 || res.status === 204) && !text) {
      apiAvailable = true;
      return data || {};
    }

    apiAvailable = true;

    if (!res.ok) {
      const error = new Error(data?.error || data?.message || `HTTP ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      apiAvailable = false;
      console.log('[EduSphere] API inalcanzable, usando datos demo');
      return mockRequest(method, endpoint, body);
    }
    throw err;
  }
}

async function mockRequest(method, endpoint, body) {
  const result = await handleMock(method, endpoint, body);
  if (result.status && result.status >= 400) {
    const error = new Error(result.data?.error || 'Error simulado');
    error.status = result.status;
    error.data = result.data;
    throw error;
  }
  return result.data;
}

export const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, body) => request('POST', endpoint, body),
  put: (endpoint, body) => request('PUT', endpoint, body),
  patch: (endpoint, body) => request('PATCH', endpoint, body),
  delete: (endpoint) => request('DELETE', endpoint),
};
