/** Candidate-web API client */

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getToken(): string {
  return localStorage.getItem('invite_token') ?? '';
}

function handleTokenExpiration(text: string): never {
  if (text.includes('token_expired') || text.includes('Token expired')) {
    localStorage.removeItem('invite_token');
    localStorage.removeItem('candidate_info');
    throw new Error('Token expirado. Por favor, solicite um novo convite.');
  }
  throw new Error(text || 'Erro na requisição');
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
