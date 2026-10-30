import { api, type DownloadedFile } from '@/lib/api-client';
import type {
  OrderDetailResponse,
  OrderNotesQuery,
  OrderNotesResponse,
  OrdersExportQuery,
  OrdersQuery,
  OrdersResponse,
  StatusesResponse,
} from '@/types/api';

export function getOrders(params: OrdersQuery, signal?: AbortSignal): Promise<OrdersResponse> {
  return api.get<OrdersResponse>('/api/orders', { ...params }, signal);
}

export function exportOrders(params: OrdersExportQuery): Promise<DownloadedFile> {
  return api.download('/api/orders/export', { ...params });
}

export function getOrder(id: number, signal?: AbortSignal): Promise<OrderDetailResponse> {
  return api.get<OrderDetailResponse>(`/api/orders/${id}`, undefined, signal);
}

export function getOrderNotes(id: number, params: OrderNotesQuery, signal?: AbortSignal): Promise<OrderNotesResponse> {
  return api.get<OrderNotesResponse>(`/api/orders/${id}/notes`, { ...params }, signal);
}

export function getStatuses(signal?: AbortSignal): Promise<StatusesResponse> {
  return api.get<StatusesResponse>('/api/orders/statuses', undefined, signal);
}
