var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
/** Mock guard: accepts Bearer dev-{userId} tokens. */
let JwtAuthGuard = class JwtAuthGuard {
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers['authorization'] ?? '';
        if (!auth.startsWith('Bearer dev-'))
            throw new UnauthorizedException();
        const userId = auth.slice('Bearer dev-'.length);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new UnauthorizedException();
        req.user = user;
        return true;
    }
};
JwtAuthGuard = __decorate([
    Injectable()
], JwtAuthGuard);
export { JwtAuthGuard };
//# sourceMappingURL=jwt-auth.guard.js.map