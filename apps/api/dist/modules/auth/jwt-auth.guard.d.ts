import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service.js';
/** Accepts both legacy `Bearer dev-{userId}` and session `Bearer sess-{uuid}` tokens. */
export declare class JwtAuthGuard implements CanActivate {
    private readonly authService;
    constructor(authService: AuthService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
