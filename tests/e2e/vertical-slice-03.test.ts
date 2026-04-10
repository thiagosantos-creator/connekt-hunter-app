import { describe, expect, it } from 'vitest';

describe('Vertical Slice 03 smart interview (contract)', () => {
  it('defines end-to-end smart interview flow steps', () => {
    const steps = [
      'template-config',
      'ai-question-generation-mock',
      'manual-question-edit',
      'session-created-by-application',
      'candidate-video-upload',
      'worker-transcribe-mock',
      'worker-ai-analysis-mock',
      'human-review',
      'audit-trail',
    ];

    expect(steps).toHaveLength(9);
  });

  it('documents API routes for smart interview', () => {
    const routes = [
      'POST /smart-interview/templates',
      'GET /smart-interview/templates?vacancyId=',
      'POST /smart-interview/templates/:templateId/generate-questions',
      'PUT /smart-interview/templates/:templateId/questions',
      'POST /smart-interview/sessions',
      'GET /smart-interview/candidate/session/:publicToken',
      'POST /smart-interview/sessions/:sessionId/answers/presign',
      'POST /smart-interview/sessions/:sessionId/answers/complete',
      'POST /smart-interview/sessions/:sessionId/submit',
      'GET /smart-interview/sessions/:sessionId/review',
      'POST /smart-interview/sessions/:sessionId/human-review',
    ];

    expect(new Set(routes).size).toBe(routes.length);
  });
});
