import { useState, useContext, createContext, useCallback } from 'react';
import type { AuthCtx, AuthUser } from '../services/types.js';

export const AuthContext = createContext<AuthCtx>({ user: null, logout: () => {}, refreshAuth: () => {} });

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

export function useAuthProvider(): { user: AuthUser | null; logout: () => void; refreshAuth: () => void } {
  const raw = localStorage.getItem('bo_user');
  const [user, setUser] = useState<AuthUser | null>(
    raw ? (JSON.parse(raw) as AuthUser) : null,
  );
  const logout = useCallback(() => {
    localStorage.removeItem('bo_token');
    localStorage.removeItem('bo_user');
    setUser(null);
  }, []);
  const refreshAuth = useCallback(() => {
    const stored = localStorage.getItem('bo_user');
    setUser(stored ? (JSON.parse(stored) as AuthUser) : null);
  }, []);
  return { user, logout, refreshAuth };
}
