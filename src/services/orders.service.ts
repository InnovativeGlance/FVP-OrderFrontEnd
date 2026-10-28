import { api } from '@/lib/api-client';
import type { OrdersQuery, OrdersResponse, StatusesResponse } from '@/types/api';

export function getOrders(params: OrdersQuery, signal?: AbortSignal): Promise<OrdersResponse> {
  return api.get<OrdersResponse>('/api/orders', { ...params }, signal);
}

export function getStatuses(signal?: AbortSignal): Promise<StatusesResponse> {
  return api.get<StatusesResponse>('/api/orders/statuses', undefined, signal);
}
