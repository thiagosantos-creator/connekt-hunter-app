export interface CandidateInfo {
  id: string;
  email: string;
  token: string;
  profile?: { fullName?: string };
  onboarding?: {
    basicCompleted: boolean;
    consentCompleted: boolean;
    resumeCompleted: boolean;
    status: string;
  };
}
