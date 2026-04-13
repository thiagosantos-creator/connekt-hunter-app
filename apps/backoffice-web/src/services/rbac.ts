import type { AuthUser } from './types.js';

export type AppRole = 'admin' | 'headhunter' | 'client';

export type Permission =
  | 'vacancies:write'
  | 'vacancies:read'
  | 'candidates:invite'
  | 'applications:read'
  | 'shortlist:write'
  | 'shortlist:read'
  | 'decision:write'
  | 'decision:read'
  | 'smart-interview:configure'
  | 'smart-interview:review'
  | 'users:manage'
  | 'audit:read'
  | 'tenant-admin:manage'
  | 'access-control:manage'
  | 'communications:manage'
  | 'executive-dashboard:read';

const rolePermissions: Record<AppRole, Permission[]> = {
  admin: [
    'vacancies:write',
    'vacancies:read',
    'candidates:invite',
    'applications:read',
    'shortlist:write',
    'shortlist:read',
    'decision:write',
    'decision:read',
    'smart-interview:configure',
    'smart-interview:review',
    'users:manage',
    'audit:read',
    'tenant-admin:manage',
    'access-control:manage',
    'communications:manage',
    'executive-dashboard:read',
  ],
  headhunter: [
    'vacancies:write',
    'vacancies:read',
    'candidates:invite',
    'applications:read',
    'shortlist:write',
    'shortlist:read',
    'decision:read',
    'smart-interview:configure',
    'smart-interview:review',
    'communications:manage',
    'executive-dashboard:read',
  ],
  client: [
    'vacancies:read',
    'applications:read',
    'shortlist:read',
    'decision:write',
    'decision:read',
    'smart-interview:review',
    'executive-dashboard:read',
  ],
};

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return rolePermissions[(user.role as AppRole) ?? 'client']?.includes(permission) ?? false;
}

export function hasRole(user: AuthUser | null, roles: AppRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as AppRole);
}
