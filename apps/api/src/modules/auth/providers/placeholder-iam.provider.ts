import { Injectable, Logger } from '@nestjs/common';
import type { AuthProvider, AuthSession, LoginResult } from '../auth.types.js';

@Injectable()
export class PlaceholderIamProvider implements AuthProvider {
  readonly name = 'iam-placeholder';
  private readonly logger = new Logger(PlaceholderIamProvider.name);

  async login(_input: { email: string; password?: string }): Promise<LoginResult | null> {
    this.logger.debug('Real IAM provider is disabled. Enable AUTH_REAL_PROVIDER=true in staging env.');
    return null;
  }

  async validateToken(_token: string): Promise<AuthSession | null> {
    return null;
  }
}
