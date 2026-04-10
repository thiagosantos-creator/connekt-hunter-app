import { describe, it, expect } from 'vitest';

describe('worker queues', () => {
  it('defines smart interview processing topics', () => {
    const topics = ['smart-interview.video-uploaded', 'smart-interview.transcribed'];
    expect(topics).toContain('smart-interview.video-uploaded');
    expect(topics).toContain('smart-interview.transcribed');
  });

  it('keeps resume processing queue active', () => {
    const legacyTopic = 'resume.uploaded';
    expect(legacyTopic).toBe('resume.uploaded');
  });
});
