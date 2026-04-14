/** Backoffice API client — typed fetch wrapper with Bearer auth */

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getToken(): string {
  return localStorage.getItem('bo_token') ?? '';
}

function handleSessionExpired(): never {
  localStorage.removeItem('bo_token');
  localStorage.removeItem('bo_user');
  window.location.href = '/login';
  throw new Error('Sessão expirada. Faça login novamente.');
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) handleSessionExpired();
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}
