import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpTracingInterceptor } from './modules/telemetry/http-tracing.interceptor.js';
import { GlobalExceptionFilter } from './modules/telemetry/global-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
  app.use(helmet());

  // CORS — restrict to explicit origins; fall back to localhost for dev
  const allowedOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins?.length
      ? allowedOrigins
      : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global interceptors & filters
  app.useGlobalInterceptors(new HttpTracingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Graceful shutdown — let NestJS drain connections on SIGTERM/SIGINT
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API running on :${port}`);
}

bootstrap();
