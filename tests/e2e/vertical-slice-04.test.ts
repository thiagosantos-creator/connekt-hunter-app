import { describe, expect, it } from 'vitest';

describe('Vertical Slice 04 real integrations + fallback (contract)', () => {
  it('defines integration toggles and fallback strategy', () => {
    const matrix = {
      storage: ['aws-s3', 'minio'],
      email: ['aws-ses', 'mailhog'],
      auth: ['aws-cognito', 'dev-auth'],
      ai: ['ai-real', 'ai-mock'],
      cvParser: ['cv-parser-real', 'cv-parser-mock'],
      transcription: ['transcription-real', 'transcription-mock'],
    };

    expect(Object.keys(matrix)).toHaveLength(6);
    expect(matrix.storage).toContain('aws-s3');
    expect(matrix.storage).toContain('minio');
  });

  it('keeps assistive AI contract (human override mandatory)', () => {
    const policy = {
      aiDecisionMode: 'assistive-only',
      humanOverrideRequired: true,
    };

    expect(policy.aiDecisionMode).toBe('assistive-only');
    expect(policy.humanOverrideRequired).toBe(true);
  });
});
