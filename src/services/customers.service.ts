import { api } from '@/lib/api-client';
import type { CustomerDetailResponse } from '@/types/api';

export function getCustomer(email: string, signal?: AbortSignal): Promise<CustomerDetailResponse> {
  return api.get<CustomerDetailResponse>('/api/customers', { email }, signal);
}
