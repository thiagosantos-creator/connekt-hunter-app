export type AppRole = 'admin' | 'headhunter' | 'client' | 'candidate';
export type MembershipReference = { organizationId: string };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  organizationIds: string[];
  title?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: string;
  provider: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
  expiresAt: string;
  provider: string;
}

export interface AuthProvider {
  name: string;
  login(input: { email: string; password?: string }): Promise<LoginResult | null>;
  validateToken(token: string): Promise<AuthSession | null>;
}
