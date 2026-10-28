import { api } from '@/lib/api-client';
import type { LoginResponse } from '@/types/api';

export function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/api/login', { email, password }, false);
}
