import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions.js';

describe('RBAC permissions', () => {
  it('allows headhunter to write vacancy', () => {
    expect(hasPermission('headhunter', 'vacancies:write')).toBe(true);
  });

  it('denies candidate by default', () => {
    expect(hasPermission('candidate', 'vacancies:read')).toBe(false);
  });
});
