import type { AppRole } from '../auth.types.js';

export type Permission =
  | 'vacancies:write'
  | 'vacancies:read'
  | 'candidates:invite'
  | 'applications:read'
  | 'shortlist:write'
  | 'decision:write'
  | 'decision:read';

const rolePermissions: Record<AppRole, Permission[]> = {
  admin: ['vacancies:write', 'vacancies:read', 'candidates:invite', 'applications:read', 'shortlist:write', 'decision:write', 'decision:read'],
  headhunter: ['vacancies:write', 'vacancies:read', 'candidates:invite', 'applications:read', 'shortlist:write', 'decision:read'],
  client: ['vacancies:read', 'applications:read', 'decision:write', 'decision:read'],
  candidate: [],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
