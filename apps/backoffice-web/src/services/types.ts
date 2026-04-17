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
  refreshAuth: () => Promise<void>;
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
  closedAt?: string;
  closedBy?: string;
  filledAt?: string;
  guaranteeEndDate?: string;
  department?: string;
  requiredSkills?: string[];
  desiredSkills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  organization?: { id: string; name?: string };
  publicationReady?: boolean;
  publicationMissingFields?: string[];
  publicUrl?: string;
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
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    publicName?: string;
    communicationDomain?: string;
    contactEmail?: string;
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

export interface ManagedCandidate {
  id: string;
  organizationId: string;
  email: string;
  phone?: string | null;
  fullName?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  guestUpgradeAt?: string | null;
  userId?: string | null;
  hasLoginAccount: boolean;
  authProviders: string[];
  applicationsCount: number;
  invitesCount: number;
  canRequestPasswordReset: boolean;
  lastInvite?: {
    id: string;
    channel: string;
    destination: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface CandidatePasswordResetResult {
  status: 'sent' | 'manual_action_required';
  provider: string;
  email: string;
  message: string;
  resetUrl?: string | null;
}

export interface CandidateInviteResendResult {
  inviteId: string;
  inviteStatus: string;
  inviteChannel: string;
  inviteDestination: string;
  token: string;
  accessUrl: string;
  message: string;
}

export interface CandidateRecommendation {
  id: string;
  candidateId: string;
  vacancyId: string;
  recommendationType: string;
  title: string;
  explanation: string;
  confidence: number;
  actionableInsights?: string[] | string;
}

export interface Application {
  id: string;
  status: string;
  createdAt: string;
  candidate: {
    id: string;
    email: string;
    phone?: string;
    token?: string;
    profile?: {
      fullName?: string;
      phone?: string;
      photoUrl?: string;
      photoProvider?: string;
      introVideoKey?: string;
      introVideoPlaybackUrl?: string;
      introVideoSummary?: string;
      introVideoTags?: string[];
      introVideoSentimentJson?: Record<string, unknown>;
      introVideoAnalysisStatus?: string;
      introVideoDurationSec?: number;
    };
  };
  vacancy: {
    title: string;
    id: string;
    organizationId?: string;
    location?: string;
    workModel?: string;
    seniority?: string;
    requiredSkills?: string[];
    desiredSkills?: string[];
    organization?: {
      id: string;
      name: string;
      tenantSettings?: {
        logoUrl?: string;
        bannerUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        publicName?: string;
        contactEmail?: string;
      };
    };
  };
}

export interface ResumeParsedExperience {
  company?: string;
  role?: string;
  period?: string;
  summary?: string;
  techStack?: string[] | string;
  confidence?: number;
}

export interface ResumeParsedEducation {
  institution?: string;
  degree?: string;
  period?: string;
  confidence?: number;
}

export interface ResumeParsedSkill {
  name?: string;
  confidence?: number;
}

export interface ResumeParsedLanguage {
  name?: string;
  level?: string;
  confidence?: number;
}

export interface ResumeParsedPayload {
  summary?: string;
  experience?: ResumeParsedExperience[];
  education?: ResumeParsedEducation[];
  skills?: Array<ResumeParsedSkill | string>;
  languages?: Array<ResumeParsedLanguage | string>;
  location?: {
    city?: string;
    confidence?: number;
  } | string;
  metadata?: Record<string, unknown>;
}

export interface ApplicationDetail extends Application {
  candidate: Application['candidate'] & {
    invites?: Array<{
      id: string;
      channel: string;
      destination: string;
      status: string;
      createdAt: string;
      sentAt?: string;
    }>;
    onboarding?: {
      id: string;
      status: string;
      basicCompleted: boolean;
      consentCompleted: boolean;
      resumeCompleted: boolean;
      consents?: Array<{
        id: string;
        type: string;
        accepted: boolean;
        acceptedAt: string;
      }>;
      resumes?: Array<{
        id: string;
        objectKey: string;
        provider: string;
        status: string;
        uploadedAt: string;
        parseResult?: {
          id: string;
          status: string;
          parsedJson: ResumeParsedPayload;
        };
        parseMetadata?: {
          id: string;
          provider: string;
          status: string;
          confidenceJson?: Record<string, unknown>;
        };
      }>;
    };
  };
  evaluations?: Array<{
    id: string;
    comment: string;
    createdAt: string;
    ratingTechnical?: number | null;
    ratingBehavioral?: number | null;
    ratingInterviewer?: number | null;
    ratingAi?: number | null;
    overallRating?: number | null;
    evaluator?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  shortlistItems?: Array<{
    id: string;
    createdAt: string;
    decisions?: Array<{
      id: string;
      decision: string;
      createdAt: string;
      reviewer?: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  }>;
  smartInterviewSessions?: Array<{
    id: string;
    status: string;
    startedAt?: string;
    submittedAt?: string;
    reviewedAt?: string;
    aiAnalysis?: {
      id: string;
      status: string;
      summary: string;
      highlights?: string[] | Record<string, unknown>;
      risks?: string[] | Record<string, unknown>;
    };
    humanReview?: {
      id: string;
      decision: string;
      notes: string;
      createdAt: string;
      reviewer?: {
        id: string;
        name: string;
        email: string;
      };
    };
  }>;
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
  ratingTechnical?: number | null;
  ratingBehavioral?: number | null;
  ratingInterviewer?: number | null;
  ratingAi?: number | null;
  overallRating?: number | null;
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
  payload?: Record<string, unknown>;
}

export interface ShortlistItemWithApplication {
  id: string;
  applicationId: string;
  createdAt: string;
  application: Application;
}

export interface CandidateMatchingRecord {
  id: string;
  score: number;
  status: string;
  computedAt?: string;
  breakdowns?: Array<{
    id?: string;
    dimension: string;
    score: number;
    weight: number;
    reasoning: string;
  }>;
  explanations?: Array<{
    id?: string;
    context: string;
    explanation: string;
    generatedBy: string;
  }>;
}

export interface CandidateRiskRecord {
  id: string;
  overallRisk: string;
  riskScore: number;
  explanation: string;
  requiresReview: boolean;
  findings?: Array<{
    type?: string;
    severity?: string;
    score?: number;
    detail?: string;
  }>;
}

export interface CandidateInsightRecord {
  id: string;
  summary: string;
  strengths?: string[];
  risks?: string[];
  recommendations?: string[];
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

export interface ReviewLinkResult {
  url: string;
  expiresAt: string;
}

export interface PublicReviewShortlistItem {
  id: string;
  applicationId: string;
  createdAt: string;
  currentDecision: string | null;
  candidate: {
    id: string;
    fullName: string | null;
    photoUrl: string | null;
  };
  vacancy: {
    id: string;
    title: string;
    location: string | null;
    seniority: string | null;
    requiredSkills: string[];
    organization: {
      name: string | null;
      tenantSettings: {
        logoUrl: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        publicName: string | null;
      } | null;
    };
  };
}
