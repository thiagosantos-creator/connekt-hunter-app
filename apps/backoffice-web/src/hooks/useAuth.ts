import { useState, useContext, createContext } from 'react';
import type { AuthCtx, AuthUser } from '../services/types.js';

export const AuthContext = createContext<AuthCtx>({ user: null, logout: () => {} });

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

export function useAuthProvider(): { user: AuthUser | null; logout: () => void } {
  const raw = localStorage.getItem('bo_user');
  const [user, setUser] = useState<AuthUser | null>(
    raw ? (JSON.parse(raw) as AuthUser) : null,
  );
  const logout = () => {
    localStorage.removeItem('bo_token');
    localStorage.removeItem('bo_user');
    setUser(null);
  };
  return { user, logout };
}
