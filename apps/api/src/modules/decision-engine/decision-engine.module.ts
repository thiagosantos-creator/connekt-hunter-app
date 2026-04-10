import { Module } from '@nestjs/common';
import { DecisionEngineService } from './decision-engine.service.js';
import { DecisionEngineController } from './decision-engine.controller.js';

@Module({ providers: [DecisionEngineService], controllers: [DecisionEngineController] })
export class DecisionEngineModule {}
