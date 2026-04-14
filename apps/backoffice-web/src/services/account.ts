import { apiGet, apiPost, apiPut } from './api.js';
import type { AuditEvent, AuthUser, CandidateInvite, CandidateInviteResendResult, CandidatePasswordResetResult, ManagedCandidate, ManagedUser } from './types.js';

const PROFILE_KEY = 'bo_user';

export function saveProfile(user: AuthUser): AuthUser {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  return user;
}

export async function refreshStoredProfile(): Promise<AuthUser> {
  const user = await apiGet<AuthUser>('/auth/me');
  saveProfile(user);
  return user;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  uploadMethod: 'PUT';
  uploadHeaders: Record<string, string>;
  publicUrl: string;
  objectKey: string;
}

export async function uploadFileToPresignedUrl(upload: PresignedUploadResponse, file: File) {
  const response = await fetch(upload.uploadUrl, {
    method: upload.uploadMethod,
    headers: upload.uploadHeaders,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar arquivo para storage: ${response.status}`);
  }
}

export async function updateMyProfile(payload: {
  name?: string;
  title?: string;
  avatarUrl?: string;
}) {
  return apiPut<{ ok: true }>('/admin/users/me/profile', payload);
}

export async function requestMyAvatarUpload(file: File) {
  return apiPost<PresignedUploadResponse>('/admin/users/me/avatar-upload-url', {
    filename: file.name,
    contentType: file.type || undefined,
  });
}

export async function confirmMyAvatarUpload(objectKey: string) {
  return apiPost<{ ok: true; avatarUrl: string }>('/admin/users/me/avatar-confirm', { objectKey });
}

export async function uploadMyAvatar(file: File) {
  const upload = await requestMyAvatarUpload(file);
  await uploadFileToPresignedUrl(upload, file);
  return confirmMyAvatarUpload(upload.objectKey);
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

export async function createManagedUser(input: {
  organizationId: string;
  email: string;
  name: string;
  role: ManagedUser['role'];
  title?: string;
}): Promise<ManagedUser> {
  return apiPost<ManagedUser>('/admin/users', input);
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

export async function resendCandidateInvite(candidateId: string): Promise<CandidateInviteResendResult> {
  return apiPost<CandidateInviteResendResult>(`/admin/candidates/${candidateId}/resend-invite`, {});
}

export async function requestOrganizationBrandingUpload(
  organizationId: string,
  type: 'logo' | 'banner',
  file: File,
) {
  return apiPost<PresignedUploadResponse>(`/organizations/${organizationId}/branding/${type}/upload-url`, {
    filename: file.name,
    contentType: file.type || undefined,
  });
}

export async function confirmOrganizationBrandingUpload(
  organizationId: string,
  type: 'logo' | 'banner',
  objectKey: string,
) {
  return apiPost<{ ok: true; publicUrl: string }>(`/organizations/${organizationId}/branding/${type}/confirm`, {
    objectKey,
  });
}

export async function uploadOrganizationBrandingAsset(
  organizationId: string,
  type: 'logo' | 'banner',
  file: File,
) {
  const upload = await requestOrganizationBrandingUpload(organizationId, type, file);
  await uploadFileToPresignedUrl(upload, file);
  return confirmOrganizationBrandingUpload(organizationId, type, upload.objectKey);
}

export function generateMockMfaQr(email: string): string {
  return `otpauth://totp/Connekt:${email}?secret=DEMO-MFA-SECRET&issuer=Connekt`;
}
