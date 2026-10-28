import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { clearToken, getToken, getUserEmail, setToken } from '@/lib/token';
import { login as loginRequest } from '@/services/auth.service';

interface AuthContextValue {
  token: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [userEmail, setUserEmail] = useState<string | null>(() => getUserEmail());

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUserEmail(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    setToken(res.accessToken, res.user.email);
    setTokenState(res.accessToken);
    setUserEmail(res.user.email);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
      // several requests can 401 at once; the id keeps it to a single toast
      toast.error('Session expired, please log in again', { id: 'session-expired' });
    });
    return () => setUnauthorizedHandler(() => {});
  }, [logout, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, userEmail, isAuthenticated: Boolean(token), login, logout }),
    [token, userEmail, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
