import { Module } from '@nestjs/common';
import { RecommendationEngineService } from './recommendation-engine.service.js';
import { RecommendationEngineController } from './recommendation-engine.controller.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({ imports: [IntegrationsModule], providers: [RecommendationEngineService], controllers: [RecommendationEngineController] })
export class RecommendationEngineModule {}
