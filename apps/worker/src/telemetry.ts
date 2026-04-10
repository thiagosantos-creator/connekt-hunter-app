import { randomUUID } from 'node:crypto';

export async function withWorkerSpan<T>(name: string, attributes: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const traceId = randomUUID().replaceAll('-', '');
  const spanId = randomUUID().replaceAll('-', '').slice(0, 16);
  console.log(JSON.stringify({ source: 'worker', event: 'worker_span_start', name, traceId, spanId, ...attributes }));
  try {
    const result = await fn();
    console.log(JSON.stringify({ source: 'worker', event: 'worker_span_end', name, traceId, spanId, status: 'ok' }));
    return result;
  } catch (error) {
    console.error(JSON.stringify({ source: 'worker', event: 'worker_span_end', name, traceId, spanId, status: 'error', error: String(error) }));
    throw error;
  }
}
