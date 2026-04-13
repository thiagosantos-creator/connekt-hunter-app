import { Module } from '@nestjs/common';
import { DecisionEngineService } from './decision-engine.service.js';
import { DecisionEngineController } from './decision-engine.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ imports: [AuthModule], providers: [DecisionEngineService], controllers: [DecisionEngineController] })
export class DecisionEngineModule {}
