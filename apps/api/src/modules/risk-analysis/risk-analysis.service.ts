import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class RiskAnalysisService {
  constructor(private readonly aiGateway: AiGateway) {}

  async analyze(candidateId: string, vacancyId: string, actorId?: string) {
    const result = await this.aiGateway.analyzeRiskPatterns({ candidateId, vacancyId });

    await prisma.riskSignal.deleteMany({ where: { candidateId, vacancyId } });
    for (const finding of result.findings) {
      await prisma.riskSignal.create({
        data: { candidateId, vacancyId, signalType: finding.type, severity: finding.severity, score: finding.score, details: { detail: finding.detail } as never },
      });
    }

    const evaluation = await prisma.riskEvaluation.upsert({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      update: { overallRisk: result.overallRisk, riskScore: result.riskScore, findings: result.findings as never, explanation: result.explanation, requiresReview: true },
      create: { candidateId, vacancyId, overallRisk: result.overallRisk, riskScore: result.riskScore, findings: result.findings as never, explanation: result.explanation, requiresReview: true },
    });

    await prisma.auditEvent.create({ data: { actorId, action: 'risk.analyzed', entityType: 'Candidate', entityId: candidateId, metadata: { vacancyId, riskScore: result.riskScore } as never } });

    return evaluation;
  }

  async get(candidateId: string, vacancyId: string) {
    return prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });
  }
}
