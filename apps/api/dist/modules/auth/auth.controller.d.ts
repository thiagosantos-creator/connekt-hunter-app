import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password?: string;
    }): Promise<import("./auth.types.js").LoginResult>;
    devLogin(body: {
        email: string;
    }): Promise<import("./auth.types.js").LoginResult>;
    guestUpgrade(body: {
        token: string;
        email: string;
        fullName: string;
    }): Promise<import("./auth.types.js").LoginResult>;
    getSession(user: AuthUser | undefined): {
        user: AuthUser;
    };
    me(user: AuthUser | undefined): AuthUser;
    logout(req: {
        headers: Record<string, string>;
    }): Promise<{
        ok: boolean;
    }>;
}
