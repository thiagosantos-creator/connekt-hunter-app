import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions.js';

describe('RBAC permissions', () => {
  it('allows headhunter to write vacancy', () => {
    expect(hasPermission('headhunter', 'vacancies:write')).toBe(true);
  });

  it('denies candidate by default', () => {
    expect(hasPermission('candidate', 'vacancies:read')).toBe(false);
  });

  it('allows client to read shortlist items', () => {
    expect(hasPermission('client', 'shortlist:read')).toBe(true);
  });

  it('denies candidate from reading shortlist', () => {
    expect(hasPermission('candidate', 'shortlist:read')).toBe(false);
  });

  it('allows admin to read shortlist items', () => {
    expect(hasPermission('admin', 'shortlist:read')).toBe(true);
  });
});


it('allows headhunter to configure smart interview', () => {
  expect(hasPermission('headhunter', 'smart-interview:configure')).toBe(true);
});
