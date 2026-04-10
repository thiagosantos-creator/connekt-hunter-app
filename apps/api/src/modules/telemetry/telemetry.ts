import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

type TraceCtx = { traceId: string; spanId: string };
const storage = new AsyncLocalStorage<TraceCtx>();

export async function withSpan<T>(name: string, attributes: Record<string, string | number | boolean>, fn: () => Promise<T>): Promise<T> {
  const parent = storage.getStore();
  const traceId = parent?.traceId ?? randomUUID().replaceAll('-', '');
  const spanId = randomUUID().replaceAll('-', '').slice(0, 16);
  return storage.run({ traceId, spanId }, async () => fn());
}

export function currentTraceContext(): { traceId?: string; spanId?: string } {
  return storage.getStore() ?? {};
}
