import { describe, expect, it } from 'vitest';
import { resolveOrganizationId } from './account.js';
import type { AuthUser } from './types.js';

function makeUser(partial: Partial<AuthUser>): AuthUser {
  return {
    id: 'u-1',
    email: 'user@demo.local',
    name: 'Demo User',
    role: 'admin',
    ...partial,
  };
}

describe('resolveOrganizationId', () => {
  it('prefers organizationIds from auth payload', () => {
    const organizationId = resolveOrganizationId(makeUser({ organizationIds: ['org_main'], tenantId: 'tenant-legacy' }));
    expect(organizationId).toBe('org_main');
  });

  it('falls back to tenantId when organizationIds are absent', () => {
    const organizationId = resolveOrganizationId(makeUser({ tenantId: 'tenant-legacy' }));
    expect(organizationId).toBe('tenant-legacy');
  });

  it('uses seeded default organization when user has no org reference', () => {
    const organizationId = resolveOrganizationId(makeUser({}));
    expect(organizationId).toBe('org_demo');
  });
});
