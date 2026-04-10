import { Module } from '@nestjs/common';
import { RiskAnalysisService } from './risk-analysis.service.js';
import { RiskAnalysisController } from './risk-analysis.controller.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({ imports: [IntegrationsModule], providers: [RiskAnalysisService], controllers: [RiskAnalysisController] })
export class RiskAnalysisModule {}
