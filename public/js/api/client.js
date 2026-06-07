/**
 * HTTP Client — Fetch wrapper with auth, error handling.
 * Automatically falls back to mock data when API is unreachable.
 */
import { handleMock } from './mock.js';

const API_BASE = 'http://localhost:3000/api/v1';

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
    const data = isJson ? await res.json().catch(() => null) : null;

    // If non-JSON response (serve's 404 HTML page), API is not running
    if (!isJson && !res.ok) {
      apiAvailable = false;
      console.log('[EduSphere] API not available (non-JSON response), switching to mock data');
      return mockRequest(method, endpoint, body);
    }

    apiAvailable = true;

    if (!res.ok) {
      const error = new Error(data?.error || `HTTP ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Network error (connection refused, etc.) — switch to mocks
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      apiAvailable = false;
      console.log('[EduSphere] API unreachable, using mock data');
      return mockRequest(method, endpoint, body);
    }
    throw err;
  }
}

async function mockRequest(method, endpoint, body) {
  const result = await handleMock(method, endpoint, body);

  if (result.status && result.status >= 400) {
    const error = new Error(result.data?.error || 'Mock error');
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
