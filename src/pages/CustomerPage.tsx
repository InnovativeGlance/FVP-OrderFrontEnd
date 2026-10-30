import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarPlus,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { StatGrid } from '@/components/dashboard/StatCards';
import type { CustomerPageState } from '@/components/customers/CustomerLink';
import { ExportButton } from '@/components/orders/ExportButton';
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Pagination } from '@/components/orders/Pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, isAbortError } from '@/lib/api-client';
import { PAGE_SIZES } from '@/lib/constants';
import { formatAddress, formatMoney, formatNumber, formatUtcDate } from '@/lib/format';
import { getCustomer } from '@/services/customers.service';
import { getOrders } from '@/services/orders.service';
import type { CustomerDetailResponse, OrdersQuery, OrdersResponse, SortBy, SortOrder } from '@/types/api';

const DEFAULT_SORT_BY: SortBy = 'createdAt';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';
const DEFAULT_LIMIT = 25;

// Same on every row of one customer's orders
const HIDDEN_COLUMNS: readonly SortBy[] = ['customerName', 'email', 'location'];
const SORT_KEYS: readonly SortBy[] = ['orderId', 'createdAt', 'itemsTotalQty', 'total', 'status'];

const SUMMARY_TITLES = ['Total Orders', 'Total Spent', 'First Order', 'Last Order'];
const SUMMARY_ICONS = [ShoppingCart, DollarSign, CalendarPlus, CalendarClock];

type ParamKey = 'sortBy' | 'sortOrder' | 'page' | 'limit';
type CustomerData = CustomerDetailResponse['data'];

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function initials(name: string | null, email: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return email.charAt(0);
  return words.length === 1 ? words[0].charAt(0) : `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`;
}

function ContactField({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sand-50 text-muted-foreground [&_svg]:size-4"
        aria-hidden
      >
        <Icon />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm break-words text-foreground">{children || '-'}</dd>
      </div>
    </div>
  );
}

function CustomerHeader({ email, data }: { email: string; data: CustomerData | null }) {
  const customer = data?.customer;
  const linkClass = 'underline-offset-4 hover:text-primary hover:underline dark:hover:text-gold';

  return (
    <Card className="gap-0 py-0 shadow-xs">
      <div className="flex items-center gap-4 border-b border-sand p-4 sm:p-6">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground uppercase ring-2 ring-gold"
          aria-hidden
        >
          {customer ? initials(customer.name, email) : ''}
        </span>
        <div className="min-w-0 flex-1">
          {customer ? (
            <h1 className="truncate text-2xl font-semibold tracking-tight">{customer.name || customer.email || email}</h1>
          ) : (
            <Skeleton className="h-8 w-56 max-w-full" />
          )}
          {customer?.company && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{customer.company}</span>
            </p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        <ContactField icon={Mail} label="Email">
          <a href={`mailto:${customer?.email ?? email}`} className={linkClass}>
            {customer?.email ?? email}
          </a>
        </ContactField>
        <ContactField icon={Phone} label="Phone">
          {customer ? (
            customer.phone && (
              <a href={`tel:${customer.phone}`} className={linkClass}>
                {customer.phone}
              </a>
            )
          ) : (
            <Skeleton className="mt-1 h-4 w-28" />
          )}
        </ContactField>
        <ContactField icon={MapPin} label="Address">
          {customer ? formatAddress(customer.address) : <Skeleton className="mt-1 h-4 w-44" />}
        </ContactField>
      </dl>
    </Card>
  );
}

function CustomerNotFound({ backTo }: { backTo: string }) {
  return (
    <Card className="items-center gap-3 px-6 py-16 text-center shadow-xs">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserX className="size-6" aria-hidden />
      </div>
      <div>
        <h1 className="font-medium">Customer not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">There are no orders with this email address.</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={backTo}>
          <ArrowLeft />
          Back to orders
        </Link>
      </Button>
    </Card>
  );
}

export default function CustomerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const savedBackTo = (location.state as CustomerPageState | null)?.backTo;
  const backTo = savedBackTo ?? '/';

  // ---- URL state ----
  const email = searchParams.get('email')?.trim() ?? '';
  const sortByParam = searchParams.get('sortBy') as SortBy | null;
  const sortBy: SortBy = sortByParam && SORT_KEYS.includes(sortByParam) ? sortByParam : DEFAULT_SORT_BY;
  const sortOrder: SortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const limitParam = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);
  const limit = (PAGE_SIZES as readonly number[]).includes(limitParam) ? limitParam : DEFAULT_LIMIT;

  /** Merge changes into the URL (dropping defaults) and keep the router state so "Back to orders" survives paging. */
  const updateParams = useCallback(
    (changes: Partial<Record<ParamKey, string | number | undefined>>, opts: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!('page' in changes)) next.delete('page');
          for (const [key, raw] of Object.entries(changes)) {
            const value = raw === undefined ? '' : String(raw);
            const isDefault =
              value === '' ||
              (key === 'page' && value === '1') ||
              (key === 'limit' && value === String(DEFAULT_LIMIT)) ||
              (key === 'sortBy' && value === DEFAULT_SORT_BY) ||
              (key === 'sortOrder' && value === DEFAULT_SORT_ORDER);
            if (isDefault) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: opts.replace, state: savedBackTo ? ({ backTo: savedBackTo } satisfies CustomerPageState) : null },
      );
    },
    [setSearchParams, savedBackTo],
  );

  // ---- Customer details ----
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerAttempt, setCustomerAttempt] = useState(0);

  useEffect(() => {
    if (!email) return;
    const controller = new AbortController();
    setCustomer(null);
    setNotFound(false);
    setCustomerError(null);
    getCustomer(email, controller.signal)
      .then((res) => setCustomer(res.data))
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        if (err instanceof ApiError && err.status === 401) return; // handled globally
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setNotFound(true);
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load customer';
        setCustomerError(message);
        if (err instanceof ApiError && err.status === 0) toast.error(message, { id: 'network-error' });
      });
    return () => controller.abort();
  }, [email, customerAttempt]);

  // ---- Customer's orders (fetched in parallel with the details) ----
  const query = useMemo<OrdersQuery>(
    () => ({ customerEmail: email, page, limit, sortBy, sortOrder }),
    [email, page, limit, sortBy, sortOrder],
  );

  const [result, setResult] = useState<OrdersResponse | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A different customer's rows must never show under this one's header
  const [resultEmail, setResultEmail] = useState(email);
  if (resultEmail !== email) {
    setResultEmail(email);
    setResult(null);
  }

  useEffect(() => {
    if (!query.customerEmail) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOrders(query, controller.signal)
      .then((res) => {
        setResult(res);
        setLoading(false);
        const { totalPages } = res.pagination;
        if (totalPages > 0 && query.page !== undefined && query.page > totalPages) {
          updateParams({ page: totalPages }, { replace: true });
        }
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setLoading(false);
        if (err instanceof ApiError && err.status === 401) return; // handled globally
        const message = err instanceof Error ? err.message : 'Failed to load orders';
        setError(message);
        if (err instanceof ApiError && err.status === 0) toast.error(message, { id: 'network-error' });
      });
    return () => controller.abort();
  }, [query, attempt, updateParams]);

  // ---- Handlers ----
  const tableRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (next: number) => {
    updateParams({ page: next });
    const el = tableRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSort = (key: SortBy) => {
    const nextOrder: SortOrder = key === sortBy ? (sortOrder === 'desc' ? 'asc' : 'desc') : 'desc';
    updateParams({ sortBy: key, sortOrder: nextOrder });
  };

  if (!email) return <Navigate to="/" replace />;

  const summary = customer?.summary;
  const summaryValues = summary
    ? [
        formatNumber(summary.totalOrders),
        formatMoney(summary.totalSpent, summary.currency),
        formatUtcDate(summary.firstOrderDate),
        formatUtcDate(summary.lastOrderDate),
      ]
    : null;
  const totalItems = result?.pagination.totalItems;

  return (
    <div className="min-h-svh bg-page">
      <AppHeader />
      <OrderDetailsPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2.5 text-muted-foreground">
            <Link to={backTo}>
              <ArrowLeft />
              Back to orders
            </Link>
          </Button>
        </div>

        {notFound ? (
          <CustomerNotFound backTo={backTo} />
        ) : (
          <>
            {customerError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Couldn't load customer</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>{customerError}</span>
                  <Button size="sm" variant="outline" onClick={() => setCustomerAttempt((n) => n + 1)}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <CustomerHeader email={email} data={customer} />
                <StatGrid
                  label="Customer statistics"
                  titles={SUMMARY_TITLES}
                  icons={SUMMARY_ICONS}
                  values={summaryValues}
                />
              </>
            )}

            <Card className="gap-5 p-4 shadow-xs sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight">Orders</h2>
                <div className="flex items-center gap-3">
                  {totalItems !== undefined && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatNumber(totalItems)} {totalItems === 1 ? 'order' : 'orders'}
                    </span>
                  )}
                  <ExportButton
                    query={{ customerEmail: email, sortBy, sortOrder }}
                    disabled={!totalItems}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Couldn't load orders</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    <span>{error}</span>
                    <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div ref={tableRef} className="relative scroll-mt-20 overflow-hidden rounded-lg border">
                {!(error && !result) && (
                  <OrdersTable
                    rows={result?.data ?? null}
                    loading={loading}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onSelectOrder={setSelectedOrderId}
                    hiddenColumns={HIDDEN_COLUMNS}
                    totalValue={
                      typeof result?.totalOrderValue === 'number'
                        ? formatMoney(result.totalOrderValue, result.currency)
                        : undefined
                    }
                  />
                )}
                {loading && result && (
                  <div
                    role="status"
                    className="absolute inset-0 top-11 z-10 flex items-start justify-center bg-background/40 pt-16"
                  >
                    <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Loading orders…
                    </div>
                  </div>
                )}
              </div>

              <Pagination
                pagination={result?.pagination ?? null}
                limit={limit}
                disabled={loading}
                onPageChange={handlePageChange}
                onLimitChange={(l) => updateParams({ limit: l })}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
