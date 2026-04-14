import { apiGet, apiPost, apiPut } from './api.js';
import type { AuditEvent, AuthUser, CandidateInvite, CandidatePasswordResetResult, ManagedCandidate, ManagedUser } from './types.js';

const PROFILE_KEY = 'bo_user';

export function saveProfile(user: AuthUser): AuthUser {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  return user;
}

export async function listManagedUsers(organizationId: string): Promise<ManagedUser[]> {
  return apiGet<ManagedUser[]>(`/admin/users?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function updateManagedUser(input: {
  organizationId: string;
  userId: string;
  role?: ManagedUser['role'];
  isActive?: boolean;
}): Promise<ManagedUser> {
  return apiPut<ManagedUser>(`/admin/users/${input.userId}`, {
    organizationId: input.organizationId,
    role: input.role,
    isActive: input.isActive,
  });
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  return apiGet<AuditEvent[]>('/audit');
}

export async function sendCandidateInvite(payload: {
  organizationId: string;
  channel: 'email' | 'phone' | 'link';
  destination?: string;
  consent: boolean;
  vacancyId: string;
}) {
  return apiPost('/candidates/invite', payload);
}

export async function listCandidateInvites(organizationId: string): Promise<CandidateInvite[]> {
  return apiGet<CandidateInvite[]>(`/candidates/invites?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function listManagedCandidates(organizationId: string): Promise<ManagedCandidate[]> {
  return apiGet<ManagedCandidate[]>(`/admin/candidates?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function updateManagedCandidate(input: {
  candidateId: string;
  email: string;
}): Promise<ManagedCandidate> {
  return apiPut<ManagedCandidate>(`/admin/candidates/${input.candidateId}`, {
    email: input.email,
  });
}

export async function requestCandidatePasswordReset(candidateId: string): Promise<CandidatePasswordResetResult> {
  return apiPost<CandidatePasswordResetResult>(`/admin/candidates/${candidateId}/request-password-reset`, {});
}

export function generateMockMfaQr(email: string): string {
  return `otpauth://totp/Connekt:${email}?secret=DEMO-MFA-SECRET&issuer=Connekt`;
}
