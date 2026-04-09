import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class AuthService {
  async devLogin(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { token: '', error: 'user_not_found' };
    }
    return { token: `dev-${user.id}`, user };
  }
}
