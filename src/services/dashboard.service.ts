import { api } from '@/lib/api-client';
import type { DashboardCards } from '@/types/api';

export function getDashboardCards(signal?: AbortSignal): Promise<DashboardCards> {
  return api.get<DashboardCards>('/api/dashboard/cards', undefined, signal);
}
