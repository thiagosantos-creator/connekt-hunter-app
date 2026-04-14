import { useState, useContext, createContext, useCallback, useEffect } from 'react';
import type { AuthCtx, AuthUser } from '../services/types.js';
import { getToken } from '../services/api.js';
import { refreshStoredProfile } from '../services/account.js';

export const AuthContext = createContext<AuthCtx>({ user: null, logout: () => {}, refreshAuth: async () => {} });

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

export function useAuthProvider(): { user: AuthUser | null; logout: () => void; refreshAuth: () => Promise<void> } {
  const raw = localStorage.getItem('bo_user');
  const [user, setUser] = useState<AuthUser | null>(
    raw ? (JSON.parse(raw) as AuthUser) : null,
  );
  const logout = useCallback(() => {
    localStorage.removeItem('bo_token');
    localStorage.removeItem('bo_user');
    setUser(null);
  }, []);
  const refreshAuth = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }

    const nextUser = await refreshStoredProfile();
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    void refreshAuth().catch(() => {
      const stored = localStorage.getItem('bo_user');
      setUser(stored ? (JSON.parse(stored) as AuthUser) : null);
    });
  }, [refreshAuth]);

  return { user, logout, refreshAuth };
}
