import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CognitoCallbackService } from './cognito-callback.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(CognitoCallbackService) private readonly cognitoCallbackService: CognitoCallbackService,
  ) {}

  @Post('login')
  login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body.email, body.password);
  }

  /**
   * Development-only login endpoint. Disabled unless APP_ENV=local.
   */
  @Post('dev-login')
  devLogin(@Body() body: { email: string }) {
    const env = process.env.APP_ENV ?? 'local';
    if (env !== 'local' && env !== 'development' && env !== 'test') {
      throw new ForbiddenException('dev_login_disabled');
    }
    return this.authService.devLogin(body.email);
  }

  @Post('guest-upgrade')
  guestUpgrade(@Body() body: { token: string; email: string; fullName: string }) {
    return this.authService.guestUpgrade(body.token, body.email, body.fullName);
  }

  /**
   * Returns Cognito configuration for candidate social login.
   * Candidates use a dedicated Cognito User Pool with Google/LinkedIn federation.
   * No passwords are stored locally.
   */
  @Get('candidate-auth-config')
  getCandidateAuthConfig() {
    return this.authService.getCandidateAuthConfig();
  }

  /**
   * Handles the OAuth2 authorization_code callback from Cognito Hosted UI.
   * Exchanges the code for tokens, verifies the id_token, and creates a local session.
   * The optional `inviteToken` links the social identity to an existing candidate.
   * The client secret is read inside CognitoCallbackService — never passed from the controller.
   */
  @Post('cognito-callback')
  async cognitoCallback(
    @Body() body: { code: string; inviteToken?: string; state?: string },
  ) {
    if (!body.code || typeof body.code !== 'string') {
      throw new BadRequestException('authorization_code_required');
    }

    const cfg = this.authService.getCandidateAuthConfig();

    if (!cfg.poolId || !cfg.clientId || !cfg.domain) {
      throw new BadRequestException('cognito_candidate_pool_not_configured');
    }

    return this.cognitoCallbackService.handleCallback({
      code: body.code,
      state: body.state,
      poolId: cfg.poolId,
      clientId: cfg.clientId,
      domain: cfg.domain,
      redirectUri: cfg.redirectUri,
      region: cfg.region,
      inviteToken: body.inviteToken,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  getSession(@CurrentUser() user: AuthUser | undefined) {
    if (!user) throw new UnauthorizedException();
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser | undefined) {
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: { headers: Record<string, string> }) {
    const auth = req.headers.authorization ?? '';
    if (auth.startsWith('Bearer sess-')) {
      await this.authService.revokeSession(auth.slice('Bearer '.length));
    }
    return { ok: true };
  }
}
