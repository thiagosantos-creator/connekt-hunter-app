import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { PermissionsGuard } from './rbac/permissions.guard.js';

@Module({
  imports: [IntegrationsModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard, DevAuthProvider, CognitoAuthProvider, Reflector],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
