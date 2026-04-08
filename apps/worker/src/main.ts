import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

export async function bootstrapWorker() {
  return NestFactory.createApplicationContext(WorkerModule);
}

void bootstrapWorker();
