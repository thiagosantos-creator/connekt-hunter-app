import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('dev-login')
  devLogin(@Body() body: { email: string }) {
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
