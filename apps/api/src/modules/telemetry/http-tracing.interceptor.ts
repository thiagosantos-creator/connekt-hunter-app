import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { withSpan, currentTraceContext } from './telemetry.js';

@Injectable()
export class HttpTracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpTracingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const start = Date.now();

    return new Observable((subscriber) => {
      void withSpan('api.http.request', { 'http.method': req.method, 'http.url': req.url }, async () => {
        next.handle()
          .pipe(
            tap({
              next: () => {
                const trace = currentTraceContext();
                this.logger.log(JSON.stringify({ event: 'http_request_completed', method: req.method, url: req.url, latencyMs: Date.now() - start, ...trace }));
              },
            }),
          )
          .subscribe(subscriber);
      }).catch((error) => subscriber.error(error));
    });
  }
}
