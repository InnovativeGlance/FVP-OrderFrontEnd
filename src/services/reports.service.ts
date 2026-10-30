import { api } from '@/lib/api-client';
import type {
  OrdersRevenueQuery,
  OrdersRevenueReport,
  RecentOrdersQuery,
  RecentOrdersReport,
  ReportSummary,
  ReportsQuery,
  StatusBreakdownReport,
} from '@/types/api';

export function getReportSummary({ from, to }: ReportsQuery, signal?: AbortSignal): Promise<ReportSummary> {
  return api.get<ReportSummary>('/api/reports/summary', { from, to }, signal);
}

export function getOrdersRevenue(params: OrdersRevenueQuery, signal?: AbortSignal): Promise<OrdersRevenueReport> {
  return api.get<OrdersRevenueReport>('/api/reports/orders-revenue', { ...params }, signal);
}

export function getStatusBreakdown(params: ReportsQuery, signal?: AbortSignal): Promise<StatusBreakdownReport> {
  return api.get<StatusBreakdownReport>('/api/reports/status-breakdown', { ...params }, signal);
}

export function getRecentOrders(params: RecentOrdersQuery, signal?: AbortSignal): Promise<RecentOrdersReport> {
  return api.get<RecentOrdersReport>('/api/reports/recent-orders', { ...params }, signal);
}
