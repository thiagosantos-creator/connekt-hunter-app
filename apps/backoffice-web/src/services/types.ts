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
  organization?: { id: string; name?: string };
}

export interface Candidate {
  id: string;
  email: string;
  token: string;
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
}

export interface AuditEvent {
  id: string;
  action: string;
  actorEmail: string;
  target?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}
