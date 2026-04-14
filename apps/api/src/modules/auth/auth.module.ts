import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CognitoCallbackService } from './cognito-callback.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { PermissionsGuard } from './rbac/permissions.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { PublicTokenGuard } from './public-token.guard.js';
import { PublicTokenCacheService } from './public-token-cache.service.js';

@Global()
@Module({
  imports: [IntegrationsModule],
  controllers: [AuthController],
  providers: [AuthService, CognitoCallbackService, JwtAuthGuard, PermissionsGuard, RateLimitGuard, PublicTokenGuard, PublicTokenCacheService, DevAuthProvider, CognitoAuthProvider, Reflector],
  exports: [AuthService, CognitoCallbackService, JwtAuthGuard, PermissionsGuard, RateLimitGuard, PublicTokenGuard, PublicTokenCacheService],
})
export class AuthModule {}
