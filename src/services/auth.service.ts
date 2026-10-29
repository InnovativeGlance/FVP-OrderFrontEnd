import { api } from '@/lib/api-client';
import type { LoginResponse, SendCodeResponse } from '@/types/api';

export function sendCode(email: string): Promise<SendCodeResponse> {
  return api.post<SendCodeResponse>('/api/auth/send-code', { email }, false);
}

// code stays a string so leading zeros survive
export function verifyCode(email: string, code: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/api/auth/verify-code', { email, code: code.trim() }, false);
}
