import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { VacanciesModule } from './modules/vacancies/vacancies.module.js';
import { CandidatesModule } from './modules/candidates/candidates.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { ShortlistModule } from './modules/shortlist/shortlist.module.js';
import { EvaluationsModule } from './modules/evaluations/evaluations.module.js';
import { ClientDecisionsModule } from './modules/client-decisions/client-decisions.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SmartInterviewModule } from './modules/smart-interview/smart-interview.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { CandidateMatchingModule } from './modules/candidate-matching/candidate-matching.module.js';
import { CandidateInsightsModule } from './modules/candidate-insights/candidate-insights.module.js';
import { CandidateRankingModule } from './modules/candidate-ranking/candidate-ranking.module.js';
import { RecommendationEngineModule } from './modules/recommendation-engine/recommendation-engine.module.js';
import { DecisionEngineModule } from './modules/decision-engine/decision-engine.module.js';
import { WorkflowAutomationModule } from './modules/workflow-automation/workflow-automation.module.js';
import { RiskAnalysisModule } from './modules/risk-analysis/risk-analysis.module.js';
import { TenantPoliciesModule } from './modules/tenant-policies/tenant-policies.module.js';
import { NotificationPreferencesModule } from './modules/notification-preferences/notification-preferences.module.js';
import { VacancyTemplatesModule } from './modules/vacancy-templates/vacancy-templates.module.js';
import { InviteFollowUpModule } from './modules/invite-follow-up/invite-follow-up.module.js';
import { HeadhunterInboxModule } from './modules/headhunter-inbox/headhunter-inbox.module.js';
import { EnterpriseGovernanceModule } from './modules/enterprise-governance/enterprise-governance.module.js';
import { AccessControlModule } from './modules/access-control/access-control.module.js';
import { CommunicationCenterModule } from './modules/communication-center/communication-center.module.js';
import { ExecutiveDashboardModule } from './modules/executive-dashboard/executive-dashboard.module.js';
import { UserManagementModule } from './modules/user-management/user-management.module.js';
import { ClientCommentsModule } from './modules/client-comments/client-comments.module.js';
import { BillingModule } from './modules/billing/billing.module.js';

@Module({
  imports: [
    IntegrationsModule,
    AuthModule,
    OrganizationsModule,
    VacanciesModule,
    CandidatesModule,
    OnboardingModule,
    ApplicationsModule,
    ShortlistModule,
    EvaluationsModule,
    ClientDecisionsModule,
    ClientCommentsModule,
    AuditModule,
    SmartInterviewModule,
    CandidateMatchingModule,
    CandidateInsightsModule,
    CandidateRankingModule,
    RecommendationEngineModule,
    DecisionEngineModule,
    WorkflowAutomationModule,
    RiskAnalysisModule,
    TenantPoliciesModule,
    NotificationPreferencesModule,
    VacancyTemplatesModule,
    InviteFollowUpModule,
    HeadhunterInboxModule,
    EnterpriseGovernanceModule,
    AccessControlModule,
    CommunicationCenterModule,
    ExecutiveDashboardModule,
    UserManagementModule,
    BillingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
