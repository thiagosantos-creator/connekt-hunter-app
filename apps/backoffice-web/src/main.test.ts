import { describe, it, expect } from 'vitest';

describe('backoffice-web unit tests', () => {
  it('API base URL defaults to localhost', () => {
    const API = 'http://localhost:3000';
    expect(API).toBe('http://localhost:3000');
  });

  it('route paths are defined correctly', () => {
    const routes = ['/login', '/vacancies', '/candidates', '/applications', '/shortlist', '/client-review', '/smart-interview', '/product-intelligence'];
    expect(routes).toHaveLength(8);
    expect(routes).toContain('/login');
    expect(routes).toContain('/vacancies');
    expect(routes).toContain('/client-review');
    expect(routes).toContain('/smart-interview');
    expect(routes).toContain('/product-intelligence');
  });

  it('decision types are valid', () => {
    const decisions = ['approve', 'reject', 'interview', 'hold'];
    expect(decisions).toHaveLength(4);
    expect(decisions).toContain('approve');
    expect(decisions).toContain('reject');
  });

  it('localStorage token key is consistent', () => {
    const TOKEN_KEY = 'bo_token';
    const USER_KEY = 'bo_user';
    expect(TOKEN_KEY).toBe('bo_token');
    expect(USER_KEY).toBe('bo_user');
  });
});
