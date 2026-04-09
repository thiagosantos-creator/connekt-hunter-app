export declare class AuthService {
    devLogin(email: string): Promise<{
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
