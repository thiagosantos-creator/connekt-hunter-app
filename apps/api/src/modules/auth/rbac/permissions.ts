import type { AppRole } from '../auth.types.js';

export type Permission =
  | 'vacancies:write'
  | 'vacancies:read'
  | 'candidates:invite'
  | 'applications:read'
  | 'shortlist:write'
  | 'decision:write'
  | 'decision:read'
  | 'smart-interview:configure'
  | 'smart-interview:review';

const rolePermissions: Record<AppRole, Permission[]> = {
  admin: ['vacancies:write', 'vacancies:read', 'candidates:invite', 'applications:read', 'shortlist:write', 'decision:write', 'decision:read', 'smart-interview:configure', 'smart-interview:review'],
  headhunter: ['vacancies:write', 'vacancies:read', 'candidates:invite', 'applications:read', 'shortlist:write', 'decision:read', 'smart-interview:configure', 'smart-interview:review'],
  client: ['vacancies:read', 'applications:read', 'decision:write', 'decision:read', 'smart-interview:review'],
  candidate: [],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
