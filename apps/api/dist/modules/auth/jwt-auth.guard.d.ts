import { CanActivate, ExecutionContext } from '@nestjs/common';
/** Mock guard: accepts Bearer dev-{userId} tokens. */
export declare class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
