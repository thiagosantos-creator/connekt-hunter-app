/** Backoffice API client — typed fetch wrapper with Bearer auth */

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getToken(): string {
  return localStorage.getItem('bo_token') ?? '';
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
