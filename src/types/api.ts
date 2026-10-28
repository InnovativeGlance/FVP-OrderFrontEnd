export interface ApiErrorBody {
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: { email: string };
}

export const ORDER_STATUSES = [
  'Cancelled',
  'Completed',
  'Completed (Partial refund)',
  'Draft',
  'On hold',
  'Pending payment',
  'Purchase order',
  'Quote',
  'Refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Address {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  full: string | null;
}

export interface Customer {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: Address | null;
}

export interface OrderListItem {
  orderId: number;
  createdAt: string;
  customer: Customer;
  itemsTotalQty: number;
  total: number;
  currency: string;
  status: OrderStatus;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface OrdersResponse {
  data: OrderListItem[];
  pagination: Pagination;
}

export interface StatusesResponse {
  data: OrderStatus[];
}

export interface DashboardCards {
  totalOrders: number;
  totalRevenue: number;
  refundsIssued: { count: number; amount: number };
  orderDateRange: { from: string | null; to: string | null };
  currency: string;
}

export type SortBy =
  | 'orderId'
  | 'createdAt'
  | 'customerName'
  | 'email'
  | 'location'
  | 'itemsTotalQty'
  | 'total'
  | 'status';

export type SortOrder = 'asc' | 'desc';

export interface OrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  /** yyyy-MM-dd, inclusive */
  from?: string;
  /** yyyy-MM-dd, inclusive */
  to?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}
