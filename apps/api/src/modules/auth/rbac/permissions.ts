import type { AppRole } from '../auth.types.js';

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
  admin: ['vacancies:write', 'vacancies:read', 'candidates:invite', 'applications:read', 'shortlist:write', 'shortlist:read', 'decision:write', 'decision:read', 'smart-interview:configure', 'smart-interview:review', 'users:manage', 'audit:read', 'tenant-admin:manage', 'access-control:manage', 'communications:manage', 'executive-dashboard:read'],
  headhunter: ['vacancies:write', 'vacancies:read', 'candidates:invite', 'applications:read', 'shortlist:write', 'shortlist:read', 'decision:read', 'smart-interview:configure', 'smart-interview:review', 'communications:manage', 'executive-dashboard:read'],
  client: ['vacancies:read', 'applications:read', 'shortlist:read', 'decision:write', 'decision:read', 'smart-interview:review', 'executive-dashboard:read'],
  candidate: [],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
