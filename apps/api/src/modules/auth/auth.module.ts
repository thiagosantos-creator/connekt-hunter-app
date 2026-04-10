import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { PlaceholderIamProvider } from './providers/placeholder-iam.provider.js';
import { PermissionsGuard } from './rbac/permissions.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard, DevAuthProvider, PlaceholderIamProvider, Reflector],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
