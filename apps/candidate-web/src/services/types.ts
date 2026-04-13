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
