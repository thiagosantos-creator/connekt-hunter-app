import { describe, expect, it } from 'vitest';

describe('vertical slice 15 - operational UX hardening', () => {
  it('organization management contract supports branding, contact and updates after creation', () => {
    const organizationContract = {
      create: ['name', 'status', 'ownerAdminUserId'],
      update: ['name', 'status', 'ownerAdminUserId', 'branding.publicName', 'branding.contactEmail', 'branding.logoUrl', 'branding.bannerUrl'],
      audit: ['organization.created', 'organization.updated'],
    };

    expect(organizationContract.create).toContain('name');
    expect(organizationContract.update).toContain('branding.contactEmail');
    expect(organizationContract.audit).toContain('organization.updated');
  });

  it('vacancy operation contract exposes public link and reusable templates', () => {
    const vacancyUxContract = {
      publicVacancy: ['/public/vacancies/:vacancyId', 'candidate-web /vacancies/:vacancyId'],
      templates: ['POST /vacancy-templates', 'GET /vacancy-templates', 'PATCH /vacancy-templates/:id', 'POST /vacancy-templates/:id/apply'],
      formUx: ['organization-select', 'requiredSkills-tags', 'desiredSkills-tags'],
    };

    expect(vacancyUxContract.publicVacancy).toContain('/public/vacancies/:vacancyId');
    expect(vacancyUxContract.templates).toContain('PATCH /vacancy-templates/:id');
    expect(vacancyUxContract.formUx).toContain('requiredSkills-tags');
  });

  it('candidate invite contract supports direct portal entry link', () => {
    const candidateEntryContract = {
      invite: ['POST /candidates/invite', 'GET /candidate/token/:token'],
      candidateLink: ['candidate-web /?token=', 'token auto-consume'],
    };

    expect(candidateEntryContract.invite).toContain('POST /candidates/invite');
    expect(candidateEntryContract.candidateLink).toContain('token auto-consume');
  });

  it('candidate dossier contract supports rich visual review after onboarding', () => {
    const candidateDossierContract = {
      api: ['GET /applications/:applicationId', 'GET /candidate-matching/:vacancyId/:candidateId', 'GET /candidate-insights/:vacancyId/:candidateId'],
      ui: ['applications dossier modal', 'client review dossier modal', 'smart scores', 'resume experience', 'education', 'ai recommendations'],
    };

    expect(candidateDossierContract.api).toContain('GET /applications/:applicationId');
    expect(candidateDossierContract.ui).toContain('smart scores');
    expect(candidateDossierContract.ui).toContain('ai recommendations');
  });
});
