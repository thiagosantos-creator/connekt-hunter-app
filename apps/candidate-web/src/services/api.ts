/** Candidate-web API client — typed fetch wrapper with retry, timeout, and rate-limit handling */

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 500;

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

function isRetryable(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true; // network failure
  return false;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      // Handle rate limiting — prefer server Retry-After, else exponential backoff
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const delay = retryAfterHeader
          ? Number(retryAfterHeader) * 1000
          : INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return res;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    handleTokenExpiration(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${API}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(`${API}${path}`, { headers: buildHeaders() });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${API}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

