export interface ApiErrorBody {
  message: string;
}

export interface SendCodeResponse {
  message: string;
  email: string;
  expiresInMinutes: number;
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

export type OrderItemType = 'line_item' | 'shipping' | 'tax' | 'fee' | 'coupon';

export interface OrderItem {
  itemId: number;
  name?: string | null;
  type?: OrderItemType;
  qty?: number | null;
  lineTotal?: number | null;
  productId?: number | null;
}

export interface OrderNote {
  noteId: number;
  author: string | null;
  createdAt: string | null;
  content: string;
}

/** Newest first */
export interface OrderNotesResponse {
  data: OrderNote[];
}

/** The stored order document; fields WordPress never sent are missing rather than null */
export interface OrderDetail {
  orderId: number;
  status: string;
  orderDate: string;
  total?: number;
  currency?: string;
  customer?: Partial<Customer> | null;
  shipping?: { name?: string | null; company?: string | null; address?: Partial<Address> | null } | null;
  itemsTotalQty?: number;
  productsSummary?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  customerNote?: string | null;
  refundTotal?: number;
  refundReason?: string | null;
  trackingNumber?: string | null;
  trackingProvider?: string | null;
  /** Only present once the API joins the order's item collection */
  items?: OrderItem[];
}

export interface OrderDetailResponse {
  data: OrderDetail;
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
