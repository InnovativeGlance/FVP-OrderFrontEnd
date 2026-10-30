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
  'Failed',
  'On hold',
  'Pending payment',
  'Purchase order',
  'Purchase Order (Waiting To Ship)',
  'Purchase Orders (Awaiting Payment)',
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
  /** Sum of `total` over every order matching the filters (all pages, all statuses, refunds not subtracted) */
  totalOrderValue?: number;
  currency?: string;
  pagination: Pagination;
}

export type OrderItemType = 'line_item' | 'shipping' | 'tax' | 'fee' | 'coupon';

export interface OrderItem {
  itemId: number;
  type: OrderItemType;
  name: string | null;
  productId: number | null;
  qty: number;
  /** Derived by the API for product lines (amount / qty); null for shipping, tax, fee and coupon lines */
  unitPrice: number | null;
  /** Line total; for coupons this is the discount, as a positive number */
  amount: number;
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
  pagination: Pagination;
}

export interface OrderNotesQuery {
  page?: number;
  /** Max 100 */
  limit?: number;
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

export interface DashboardCardsQuery {
  status?: OrderStatus;
}

export interface CustomerSummary {
  totalOrders: number;
  /** Net revenue, same rule as the dashboard's totalRevenue */
  totalSpent: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  currency: string;
}

/** Name, company, phone and address come from the customer's most recent order */
export interface CustomerDetailResponse {
  data: { customer: Customer; summary: CustomerSummary };
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
  /** Limit the list to one customer (case-insensitive) */
  customerEmail?: string;
}

/** CSV export takes the list filters and sort; it always includes every matching order */
export type OrdersExportQuery = Omit<OrdersQuery, 'page' | 'limit'>;

export type ReportGroupBy = 'auto' | 'day' | 'week' | 'month' | 'year';

/** Shared by every /api/reports endpoint; /summary ignores sortOrder */
export interface ReportsQuery {
  /** yyyy-MM-dd, inclusive (UTC days); leave out for all time */
  from?: string;
  /** yyyy-MM-dd, inclusive */
  to?: string;
  sortOrder?: SortOrder;
}

export interface ReportSummary {
  /** Net revenue, same rule as the dashboard's totalRevenue */
  totalRevenue: number;
  /** What customers spent on the matching orders, same rule as the customer page's totalSpent */
  totalSpent: number;
  totalOrders: number;
  /** Distinct billing emails */
  totalCustomers: number;
  averageOrderValue: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  failedOrders: number;
  refundsIssued: { count: number; amount: number };
  orderDateRange: { from: string | null; to: string | null };
  currency: string;
}

export interface OrdersRevenueQuery extends ReportsQuery {
  /** `auto` picks day/week/month/year from the range; a manual choice over 1000 bars is a 400 */
  groupBy?: ReportGroupBy;
}

export interface OrdersRevenuePoint {
  /** yyyy-MM-dd start of the period */
  period: string;
  label: string;
  totalOrders: number;
  totalRevenue: number;
}

/** Empty periods come back as zeros, so there are no gaps */
export interface OrdersRevenueReport {
  groupBy: Exclude<ReportGroupBy, 'auto'>;
  sortOrder: SortOrder;
  data: OrdersRevenuePoint[];
  currency: string;
}

export type StatusSliceKey = 'completed' | 'pending' | 'processing' | 'failed' | 'other';

export interface StatusSlice {
  key: StatusSliceKey;
  label: string;
  count: number;
  percentage: number;
  revenue: number;
  /** Raw statuses grouped into this slice */
  statuses: string[];
}

/** `data` always holds all five slices, sorted by count in `sortOrder` */
export interface StatusBreakdownReport {
  totalOrders: number;
  sortOrder: SortOrder;
  data: StatusSlice[];
  statuses: { status: string; count: number; percentage: number; revenue: number }[];
  currency: string;
}

export interface RecentOrdersQuery extends ReportsQuery {
  /** Default 10, max 50 */
  limit?: number;
}

/** Always the newest `limit` orders in the range; sortOrder only changes how they are listed */
export interface RecentOrdersReport {
  data: OrderListItem[];
  sortOrder: SortOrder;
  limit: number;
}
