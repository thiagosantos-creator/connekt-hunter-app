import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpTracingInterceptor } from './modules/telemetry/http-tracing.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalInterceptors(new HttpTracingInterceptor());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API running on :${port}`);
}

bootstrap();
