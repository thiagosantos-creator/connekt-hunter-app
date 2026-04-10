import { apiPost } from './api.js';
import type { AuditEvent, AuthUser, ManagedUser } from './types.js';

const PROFILE_KEY = 'bo_user';
const AUDIT_KEY = 'bo_audit';
const USERS_KEY = 'bo_managed_users';

export function saveProfile(user: AuthUser): AuthUser {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  return user;
}

export function listManagedUsers(currentUser: AuthUser | null): ManagedUser[] {
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) return JSON.parse(stored) as ManagedUser[];

  const seed: ManagedUser[] = [
    {
      id: 'u-admin',
      email: 'admin@demo.local',
      name: 'Admin Demo',
      role: 'admin',
      tenantId: currentUser?.tenantId ?? 'org-demo',
      isActive: true,
      title: 'Administrador',
      company: 'Connekt',
    },
    {
      id: 'u-hh',
      email: 'headhunter@demo.local',
      name: 'Headhunter Demo',
      role: 'headhunter',
      tenantId: currentUser?.tenantId ?? 'org-demo',
      isActive: true,
      title: 'Talent Partner',
      company: 'Connekt',
    },
    {
      id: 'u-client',
      email: 'client@demo.local',
      name: 'Cliente Demo',
      role: 'client',
      tenantId: currentUser?.tenantId ?? 'org-demo',
      isActive: true,
      title: 'Hiring Manager',
      company: 'Cliente XPTO',
    },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
  return seed;
}

export function saveManagedUsers(users: ManagedUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function listAuditEvents(): AuditEvent[] {
  const stored = localStorage.getItem(AUDIT_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as AuditEvent[];
}

export function addAuditEvent(action: string, actorEmail: string, target?: string, metadata?: Record<string, string>): void {
  const current = listAuditEvents();
  const next: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorEmail,
    target,
    metadata,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(AUDIT_KEY, JSON.stringify([next, ...current].slice(0, 200)));
}

export async function sendCandidateInvite(payload: { organizationId: string; email: string; vacancyId: string }): Promise<void> {
  await apiPost('/candidates/invite', payload);
}

export function generateMockMfaQr(email: string): string {
  return `otpauth://totp/Connekt:${email}?secret=DEMO-MFA-SECRET&issuer=Connekt`;
}
