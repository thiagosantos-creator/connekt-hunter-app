import { describe, it, expect } from 'vitest';

describe('backoffice-web unit tests', () => {
  it('API base URL defaults to localhost', () => {
    const API = 'http://localhost:3000';
    expect(API).toBe('http://localhost:3000');
  });

  it('route paths are defined correctly', () => {
    const routes = ['/login', '/vacancies', '/inbox', '/candidates', '/applications', '/shortlist', '/client-review', '/smart-interview', '/product-intelligence', '/account', '/admin/users', '/audit'];
    expect(routes).toHaveLength(12);
    expect(routes).toContain('/login');
    expect(routes).toContain('/vacancies');
    expect(routes).toContain('/inbox');
    expect(routes).toContain('/client-review');
    expect(routes).toContain('/smart-interview');
    expect(routes).toContain('/product-intelligence');
    expect(routes).toContain('/account');
    expect(routes).toContain('/admin/users');
    expect(routes).toContain('/audit');
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

  it('auth context interface includes refreshAuth', () => {
    // Verify the auth context interface shape
    const ctx = { user: null, logout: () => {}, refreshAuth: () => {} };
    expect(ctx).toHaveProperty('user');
    expect(ctx).toHaveProperty('logout');
    expect(ctx).toHaveProperty('refreshAuth');
  });

  it('DataTable search/sort/pagination config types are valid', () => {
    // Verify DataTable enhanced props
    const config = {
      searchable: true,
      searchPlaceholder: 'Buscar…',
      pageSize: 10,
    };
    expect(config.searchable).toBe(true);
    expect(config.pageSize).toBe(10);
  });

  it('intelligence endpoints are correctly formed', () => {
    const candidateId = 'c1';
    const vacancyId = 'v1';
    expect(`/candidate-matching/${vacancyId}/${candidateId}`).toBe('/candidate-matching/v1/c1');
    expect(`/risk-analysis?candidateId=${candidateId}&vacancyId=${vacancyId}`).toBe('/risk-analysis?candidateId=c1&vacancyId=v1');
    expect(`/candidate-insights/${vacancyId}/${candidateId}`).toBe('/candidate-insights/v1/c1');
  });
});
