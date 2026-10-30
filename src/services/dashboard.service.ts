import { api } from '@/lib/api-client';
import type { DashboardCards, DashboardCardsQuery } from '@/types/api';

export function getDashboardCards(params: DashboardCardsQuery, signal?: AbortSignal): Promise<DashboardCards> {
  return api.get<DashboardCards>('/api/dashboard/cards', { ...params }, signal);
}
