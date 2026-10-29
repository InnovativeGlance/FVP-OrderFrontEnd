import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { clearToken, getToken, getUserEmail, setToken } from '@/lib/token';
import { sendCode as sendCodeRequest, verifyCode as verifyCodeRequest } from '@/services/auth.service';
import type { SendCodeResponse } from '@/types/api';

interface AuthContextValue {
  token: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  sendCode: (email: string) => Promise<SendCodeResponse>;
  verifyCode: (email: string, code: string) => Promise<void>;
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

  const sendCode = useCallback((email: string) => sendCodeRequest(email), []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await verifyCodeRequest(email, code);
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
    () => ({ token, userEmail, isAuthenticated: Boolean(token), sendCode, verifyCode, logout }),
    [token, userEmail, sendCode, verifyCode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
