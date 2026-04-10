import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth.types.js';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser | undefined => {
  const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
  return req.user;
});
