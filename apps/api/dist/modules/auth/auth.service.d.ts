import type { AuthSession, LoginResult } from './auth.types.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsConfigService } from '../integrations/integrations-config.service.js';
export declare class AuthService {
    private readonly devProvider;
    private readonly cognitoProvider;
    private readonly integrationsConfig;
    constructor(devProvider: DevAuthProvider, cognitoProvider: CognitoAuthProvider, integrationsConfig: IntegrationsConfigService);
    login(email: string, password?: string): Promise<LoginResult>;
    devLogin(email: string): Promise<LoginResult>;
    validateBearerToken(token: string): Promise<AuthSession | null>;
    revokeSession(token: string): Promise<void>;
    guestUpgrade(token: string, email: string, fullName: string): Promise<LoginResult>;
}
