/** Shared TypeScript types for backoffice-web */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationIds?: string[];
  title?: string;
  company?: string;
  avatarUrl?: string;
  tenantId?: string;
  isActive?: boolean;
}

export interface AuthCtx {
  user: AuthUser | null;
  logout: () => void;
  refreshAuth: () => void;
}

export interface Vacancy {
  id: string;
  title: string;
  description: string;
  organizationId: string;
  location?: string;
  workModel?: string;
  seniority?: string;
  sector?: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  employmentType?: string;
  publicationType?: string;
  status?: string;
  publishedAt?: string;
  department?: string;
  requiredSkills?: string[];
  desiredSkills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  organization?: { id: string; name?: string };
  publicationReady?: boolean;
  publicationMissingFields?: string[];
}

export interface VacancyTemplate {
  id: string;
  organizationId: string;
  name: string;
  sector: string;
  role: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  isFavorite: boolean;
  usageCount: number;
  defaultFields: Partial<Vacancy>;
}

export interface VacancyAssistSuggestion {
  summary: string;
  responsibilities: string[];
  requiredSkills: string[];
  desiredSkills: string[];
  keywords: string[];
  generatedByAI: boolean;
  requiresHumanReview: boolean;
  provider: string;
  generatedAt: string;
}

export interface HeadhunterInboxItem {
  id: string;
  type: string;
  applicationId: string;
  candidateId: string;
  candidateEmail: string;
  vacancyId: string;
  vacancyTitle: string;
  status: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  ageHours: number;
  quickActions: string[];
}

export interface Organization {
  id: string;
  name: string;
  status: string;
  ownerAdminUserId?: string;
  tenantPolicy?: {
    canInviteCandidates: boolean;
    canApproveDecisions: boolean;
    canAuditEvents: boolean;
    canAdministrateTenant: boolean;
  };
  tenantSettings?: {
    planSegment: string;
    timezone: string;
    tenantStatus: string;
  };
}

export interface Candidate {
  id: string;
  email: string;
  token: string;
  phone?: string;
  inviteId?: string;
  inviteStatus?: string;
  inviteChannel?: string;
  inviteDestination?: string;
}

export interface CandidateRecommendation {
  id: string;
  candidateId: string;
  vacancyId: string;
  recommendationType: string;
  title: string;
  explanation: string;
  confidence: number;
  actionableInsights?: string;
}

export interface Application {
  id: string;
  status: string;
  createdAt: string;
  candidate: { id: string; email: string };
  vacancy: { title: string; id: string; organizationId?: string };
}

export interface ShortlistItem {
  id: string;
  applicationId: string;
  shortlistId: string;
}

export interface EvalRecord {
  id: string;
  comment: string;
  evaluatorId: string;
}

export interface PriorityScore {
  id: string;
  candidateId: string;
  score: number;
  priorityBand: string;
}

export interface Decision {
  id: string;
  decision: string;
  shortlistItemId: string;
}

export interface RankingItem {
  candidateId: string;
  rank: number;
  score: number;
  manualOverride: boolean;
}

export interface WorkflowSuggestion {
  id: string;
  suggestionType: string;
  explanation: string;
  status: string;
}

export interface ShortlistItemWithApplication {
  id: string;
  applicationId: string;
  createdAt: string;
  application: Application;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'headhunter' | 'client';
  tenantId: string;
  title?: string;
  company?: string;
  avatarUrl?: string;
  isActive: boolean;
  notificationPreference?: NotificationPreference;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorEmail: string;
  target?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface NotificationPreference {
  emailEnabled: boolean;
  phoneEnabled: boolean;
  inAppEnabled: boolean;
  eventNewInvite: boolean;
  eventStepCompleted: boolean;
  eventDecision: boolean;
  eventReminder: boolean;
  eventAccessChange: boolean;
  eventCriticalAudit: boolean;
  frequency: string;
}

export interface NotificationDispatch {
  id: string;
  channel: string;
  eventKey: string;
  destination: string;
  status: string;
  failureReason?: string;
  frequency: string;
  createdAt: string;
}

export interface CandidateInvite {
  id: string;
  channel: string;
  destination: string;
  status: string;
  failureReason?: string;
  createdAt: string;
  candidate: {
    id: string;
    email: string;
    phone?: string;
    token: string;
  };
  vacancy: {
    id: string;
    title: string;
  };
}
