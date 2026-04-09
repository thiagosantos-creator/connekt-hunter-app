import { AuthService } from './auth.service.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
    }): Promise<{
        token: string;
        error: string;
        user?: undefined;
    } | {
        token: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            createdAt: Date;
        };
        error?: undefined;
    }>;
}
