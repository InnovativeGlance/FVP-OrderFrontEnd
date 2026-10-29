import { api } from '@/lib/api-client';
import type {
  OrderDetailResponse,
  OrderNotesResponse,
  OrdersQuery,
  OrdersResponse,
  StatusesResponse,
} from '@/types/api';

export function getOrders(params: OrdersQuery, signal?: AbortSignal): Promise<OrdersResponse> {
  return api.get<OrdersResponse>('/api/orders', { ...params }, signal);
}

export function getOrder(id: number, signal?: AbortSignal): Promise<OrderDetailResponse> {
  return api.get<OrderDetailResponse>(`/api/orders/${id}`, undefined, signal);
}

export function getOrderNotes(id: number, signal?: AbortSignal): Promise<OrderNotesResponse> {
  return api.get<OrderNotesResponse>(`/api/orders/${id}/notes`, undefined, signal);
}

export function getStatuses(signal?: AbortSignal): Promise<StatusesResponse> {
  return api.get<StatusesResponse>('/api/orders/statuses', undefined, signal);
}
