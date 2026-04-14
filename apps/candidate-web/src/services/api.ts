/** Candidate-web API client */

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getToken(): string {
  return localStorage.getItem('invite_token') ?? '';
}

/** Session token set after social login (Cognito callback) */
export function getSessionToken(): string {
  return localStorage.getItem('session_token') ?? '';
}

export function setSessionToken(token: string): void {
  localStorage.setItem('session_token', token);
}

export function clearSession(): void {
  localStorage.removeItem('invite_token');
  localStorage.removeItem('candidate_info');
  localStorage.removeItem('session_token');
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const session = getSessionToken();
  if (session) headers['Authorization'] = `Bearer ${session}`;
  return headers;
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
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: buildHeaders() });
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

