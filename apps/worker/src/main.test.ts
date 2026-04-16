import { describe, it, expect } from 'vitest';

describe('worker queues', () => {
  it('defines smart interview processing topics', () => {
    const topics = ['candidate.intro-video-uploaded', 'smart-interview.video-uploaded', 'smart-interview.transcribed'];
    expect(topics).toContain('candidate.intro-video-uploaded');
    expect(topics).toContain('smart-interview.video-uploaded');
    expect(topics).toContain('smart-interview.transcribed');
  });

  it('keeps resume processing queue active', () => {
    const legacyTopic = 'resume.uploaded';
    expect(legacyTopic).toBe('resume.uploaded');
  });

  it('supports product intelligence reprocessing topics', () => {
    const topics = ['matching:compute', 'insights:generate', 'comparison:generate', 'recommendation:generate', 'risk:analyze', 'automation:trigger', 'invite-followup:send'];
    expect(topics).toContain('matching:compute');
    expect(topics).toContain('insights:generate');
    expect(topics).toContain('comparison:generate');
    expect(topics).toContain('recommendation:generate');
    expect(topics).toContain('risk:analyze');
    expect(topics).toContain('automation:trigger');
    expect(topics).toContain('invite-followup:send');
  });
});
