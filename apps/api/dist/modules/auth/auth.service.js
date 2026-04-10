var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsConfigService } from '../integrations/integrations-config.service.js';
let AuthService = class AuthService {
    devProvider;
    cognitoProvider;
    integrationsConfig;
    constructor(devProvider, cognitoProvider, integrationsConfig) {
        this.devProvider = devProvider;
        this.cognitoProvider = cognitoProvider;
        this.integrationsConfig = integrationsConfig;
    }
    async login(email, password) {
        const preferRealProvider = this.integrationsConfig.isIntegrationEnabled('auth');
        if (preferRealProvider) {
            const fromCognito = await this.cognitoProvider.login({ email, password });
            if (fromCognito)
                return fromCognito;
        }
        const fromDev = await this.devProvider.login({ email, password });
        if (!fromDev) {
            throw new UnauthorizedException('user_not_found');
        }
        return fromDev;
    }
    async devLogin(email) {
        return this.login(email);
    }
    async validateBearerToken(token) {
        if (token.startsWith('dev-')) {
            const userId = token.slice('dev-'.length);
            const user = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
            if (!user)
                return null;
            return {
                token,
                provider: 'legacy-dev-token',
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    organizationIds: user.memberships.map((membership) => membership.organizationId),
                },
            };
        }
        const fromDev = await this.devProvider.validateToken(token);
        if (fromDev)
            return fromDev;
        const fromCognito = await this.cognitoProvider.validateToken(token);
        if (fromCognito)
            return fromCognito;
        return null;
    }
    async revokeSession(token) {
        await prisma.userSession.updateMany({ where: { token, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    async guestUpgrade(token, email, fullName) {
        const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token }, include: { profile: true } });
        const user = await prisma.user.upsert({
            where: { email },
            update: { name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
            create: { email, name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
        });
        await prisma.authIdentity.upsert({
            where: { provider_subject: { provider: 'candidate-passwordless', subject: email } },
            update: { userId: user.id },
            create: { provider: 'candidate-passwordless', subject: email, userId: user.id, email },
        });
        await prisma.candidate.update({
            where: { id: candidate.id },
            data: { userId: user.id, guestUpgradeAt: new Date() },
        });
        return this.login(email);
    }
};
AuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DevAuthProvider,
        CognitoAuthProvider,
        IntegrationsConfigService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map