import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuthIamModule } from './modules/auth-iam/auth-iam.module';
import { RbacTenancyModule } from './modules/rbac-tenancy/rbac-tenancy.module';
import { OrganizationsMembershipsModule } from './modules/organizations-memberships/organizations-memberships.module';
import { VacancyManagementModule } from './modules/vacancy-management/vacancy-management.module';
import { VacancyPublishingModule } from './modules/vacancy-publishing/vacancy-publishing.module';
import { CandidateCrmModule } from './modules/candidate-crm/candidate-crm.module';
import { CandidateOnboardingModule } from './modules/candidate-onboarding/candidate-onboarding.module';
import { ApplicationManagementModule } from './modules/application-management/application-management.module';
import { ResumeProcessingModule } from './modules/resume-processing/resume-processing.module';
import { InterviewMediaModule } from './modules/interview-media/interview-media.module';
import { SmartInterviewModule } from './modules/smart-interview/smart-interview.module';
import { ShortlistEvaluationModule } from './modules/shortlist-evaluation/shortlist-evaluation.module';
import { ClientReviewModule } from './modules/client-review/client-review.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { WorkflowNotificationsModule } from './modules/workflow-notifications/workflow-notifications.module';
import { AuditAdminModule } from './modules/audit-admin/audit-admin.module';
import { AiOrchestrationModule } from './modules/ai-orchestration/ai-orchestration.module';
import { IntegrationsHubModule } from './modules/integrations-hub/integrations-hub.module';

@Module({
  imports: [
    AuthIamModule,
    RbacTenancyModule,
    OrganizationsMembershipsModule,
    VacancyManagementModule,
    VacancyPublishingModule,
    CandidateCrmModule,
    CandidateOnboardingModule,
    ApplicationManagementModule,
    ResumeProcessingModule,
    InterviewMediaModule,
    SmartInterviewModule,
    ShortlistEvaluationModule,
    ClientReviewModule,
    CommunicationsModule,
    WorkflowNotificationsModule,
    AuditAdminModule,
    AiOrchestrationModule,
    IntegrationsHubModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
