/** Shared TypeScript types for backoffice-web */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthCtx {
  user: AuthUser | null;
  logout: () => void;
}

export interface Vacancy {
  id: string;
  title: string;
  description: string;
  organizationId: string;
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
  candidate: { email: string };
  vacancy: { title: string; id?: string };
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
