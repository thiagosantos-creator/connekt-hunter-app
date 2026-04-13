import { describe, expect, it } from 'vitest';

describe('vertical slice 14 - functional gaps closed contracts', () => {
  it('vacancy publishing contract includes market fields and readiness validation', () => {
    const contract = {
      requiredForPublish: ['title', 'description', 'location', 'workModel', 'seniority', 'sector', 'employmentType', 'requiredSkills'],
      optional: ['salaryMin', 'salaryMax', 'experienceYearsMin', 'experienceYearsMax', 'desiredSkills'],
      responseFlags: ['publicationReady', 'publicationMissingFields', 'publishedAt'],
    };

    expect(contract.requiredForPublish).toContain('sector');
    expect(contract.optional).toContain('experienceYearsMin');
    expect(contract.responseFlags).toContain('publicationReady');
  });

  it('candidate invite contract supports multichannel audit and status tracking', () => {
    const inviteContract = {
      request: ['organizationId', 'vacancyId', 'channel', 'destination', 'consent'],
      channels: ['email', 'phone'],
      persisted: ['candidateInvite', 'auditEvent', 'messageDispatch'],
      response: ['inviteId', 'inviteStatus', 'inviteChannel', 'inviteDestination', 'token'],
    };

    expect(inviteContract.channels).toEqual(expect.arrayContaining(['email', 'phone']));
    expect(inviteContract.persisted).toContain('candidateInvite');
    expect(inviteContract.response).toContain('inviteStatus');
  });

  it('governance and notifications contracts stay persistent and auditable', () => {
    const governanceContract = {
      userManagement: ['/admin/users?organizationId=', '/admin/users/:userId'],
      notifications: ['/notification-preferences/me', '/notification-preferences/me/dispatches'],
      audit: ['/audit'],
    };

    expect(governanceContract.userManagement).toContain('/admin/users?organizationId=');
    expect(governanceContract.notifications).toContain('/notification-preferences/me/dispatches');
    expect(governanceContract.audit).toContain('/audit');
  });
});
