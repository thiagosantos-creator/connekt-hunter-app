var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            AuthModule,
            OrganizationsModule,
            VacanciesModule,
            CandidatesModule,
            OnboardingModule,
            ApplicationsModule,
            ShortlistModule,
            EvaluationsModule,
            ClientDecisionsModule,
            AuditModule,
        ],
        controllers: [HealthController],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map