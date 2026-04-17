export interface CandidateInfo {
  id: string;
  email: string;
  token: string;
  profile?: { fullName?: string };
  applications?: Array<{
    id: string;
    vacancy: {
      id: string;
      title: string;
      publicationType?: string;
    };
  }>;
  onboarding?: {
    basicCompleted: boolean;
    consentCompleted: boolean;
    resumeCompleted: boolean;
    preferencesCompleted?: boolean;
    introVideoCompleted?: boolean;
    status: string;
  };
}

export interface PublicVacancyInfo {
  id: string;
  title: string;
  description: string;
  location?: string;
  workModel?: string;
  seniority?: string;
  sector?: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  employmentType?: string;
  requiredSkills: string[];
  desiredSkills: string[];
  salaryMin?: number;
  salaryMax?: number;
  publishedAt?: string;
  organization: {
    id: string;
    name: string;
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    contactEmail?: string;
  };
}

export interface CandidateStatus {
  candidateId: string;
  fullName: string | null;
  email: string;
  vacancy: { id: string; title: string } | null;
  onboardingStatus: string;
  preferences: {
    salaryMin?: number | null;
    salaryMax?: number | null;
    jobTitles: string[];
    languages: string[];
    workModelPreference: string[];
  } | null;
  steps: StatusStep[];
  introVideo: {
    uploadedAt?: string | null;
    durationSec?: number | null;
    analysisStatus: string;
    summary?: string | null;
    transcript?: string | null;
    transcriptLanguage?: string | null;
    tags: string[];
    sentiment?: Record<string, unknown> | null;
    entities?: Record<string, unknown>[] | null;
    keyPhrases?: Record<string, unknown>[] | null;
    analyzedAt?: string | null;
  } | null;
  interview: { id: string; status: string } | null;
  decision: { decision: string; at: string } | null;
}

export interface StatusStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface ParsedResumeData {
  status: string;
  parsedData: {
    summary?: string;
    experience?: Array<{ company?: string; role?: string; period?: string }>;
    education?: Array<{ institution?: string; degree?: string; period?: string }>;
    skills?: Array<{ name?: string } | string>;
    languages?: Array<{ name?: string; level?: string } | string>;
  } | null;
}

export interface InterviewQuestion {
  id: string;
  prompt: string;
}

export interface InterviewTemplate {
  questions: InterviewQuestion[];
}

export interface InterviewSession {
  id: string;
  template: InterviewTemplate;
}

export interface PresignResponse {
  objectKey: string;
}

export interface CandidateAuthConfig {
  hostedUiUrl?: string;
  changePasswordUrl?: string;
  socialProviders?: string[];
}

export interface ResumeUploadResponse {
  id: string;
  objectKey: string;
  provider: string;
  upload: {
    url: string;
    method: 'PUT';
    headers: Record<string, string>;
  };
}
