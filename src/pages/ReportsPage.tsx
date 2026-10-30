import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, isValid, parse } from 'date-fns';
import { AlertCircle, ArrowLeft, DollarSign, Receipt, ShoppingCart, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { StatGrid } from '@/components/dashboard/StatCards';
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrdersRevenueChart } from '@/components/reports/OrdersRevenueChart';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { StatusBreakdownChart } from '@/components/reports/StatusBreakdownChart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, isAbortError } from '@/lib/api-client';
import { formatMoney, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getOrdersRevenue, getRecentOrders, getReportSummary, getStatusBreakdown } from '@/services/reports.service';
import type { ReportGroupBy, ReportsQuery, SortOrder } from '@/types/api';

const DEFAULT_SORT_ORDER: SortOrder = 'desc';
const DEFAULT_GROUP_BY: ReportGroupBy = 'auto';
const GROUP_BY_KEYS: readonly ReportGroupBy[] = ['auto', 'day', 'week', 'month', 'year'];
const RECENT_LIMIT = 10;
const DATE_FMT = 'yyyy-MM-dd';

// Status counts are in the "Orders by Status" chart, so only the headline numbers get cards
const SUMMARY_TITLES = ['Total Revenue', 'Total Orders', 'Total Customers', 'Avg. Order Value'];
const SUMMARY_ICONS = [DollarSign, ShoppingCart, Users, Receipt];

type ParamKey = 'from' | 'to' | 'sortOrder' | 'groupBy';

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, DATE_FMT, new Date());
  return isValid(d) ? d : undefined;
}

interface ReportState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Loads one report section; reruns when `key` changes. Keeps the last data while refetching
 * so the section dims instead of flashing back to a skeleton.
 */
function useReport<T>(key: string, load: (signal: AbortSignal) => Promise<T>): ReportState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    load(controller.signal)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setLoading(false);
        setData(null);
        if (err instanceof ApiError && err.status === 401) return; // handled globally
        const message = err instanceof Error ? err.message : 'Failed to load report';
        setError(message);
        if (err instanceof ApiError && err.status === 0) toast.error(message, { id: 'network-error' });
      });
    return () => controller.abort();
    // `load` is a new closure each render; `key` captures everything it depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, retry };
}

function SectionError({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ChartCard({
  title,
  description,
  loading,
  children,
}: {
  title: string;
  description: ReactNode;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4 shadow-xs">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <div aria-busy={loading} className={cn('px-4 transition-opacity', loading && 'pointer-events-none opacity-50')}>
        {children}
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Filter state lives in the URL ----
  const fromDate = parseDateParam(searchParams.get('from'));
  const toDate = parseDateParam(searchParams.get('to'));
  const sortOrder: SortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;
  const groupByParam = searchParams.get('groupBy') as ReportGroupBy | null;
  const groupBy: ReportGroupBy = groupByParam && GROUP_BY_KEYS.includes(groupByParam) ? groupByParam : DEFAULT_GROUP_BY;

  const from = fromDate ? format(fromDate, DATE_FMT) : undefined;
  const to = toDate ? format(toDate, DATE_FMT) : undefined;

  /** Merge changes into the URL; defaults are dropped to keep links short */
  const updateParams = useCallback(
    (changes: Partial<Record<ParamKey, string | undefined>>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value = ''] of Object.entries(changes)) {
            const isDefault =
              value === '' ||
              (key === 'sortOrder' && value === DEFAULT_SORT_ORDER) ||
              (key === 'groupBy' && value === DEFAULT_GROUP_BY);
            if (isDefault) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // ---- Every section uses the same filters and reloads together ----
  const query: ReportsQuery = { from, to, sortOrder };
  const rangeKey = `${from ?? ''}|${to ?? ''}`;
  const queryKey = `${rangeKey}|${sortOrder}`;

  // /summary ignores sortOrder, so flipping the sort doesn't reload the cards
  const summary = useReport(rangeKey, (signal) => getReportSummary(query, signal));
  const bars = useReport(`${queryKey}|${groupBy}`, (signal) => getOrdersRevenue({ ...query, groupBy }, signal));
  const pie = useReport(queryKey, (signal) => getStatusBreakdown(query, signal));
  const recent = useReport(queryKey, (signal) => getRecentOrders({ ...query, limit: RECENT_LIMIT }, signal));

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const s = summary.data;
  const summaryValues = s
    ? [
        formatMoney(s.totalRevenue, s.currency),
        formatNumber(s.totalOrders),
        formatNumber(s.totalCustomers),
        formatMoney(s.averageOrderValue, s.currency),
      ]
    : null;

  const hasRange = Boolean(from || to);
  const clearRange = () => updateParams({ from: undefined, to: undefined });
  // "View all" opens the orders list with the same date range
  const ordersLink = `/${hasRange ? `?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}` : ''}`;
  const sortLabel = sortOrder === 'desc' ? 'newest first' : 'oldest first';

  return (
    <div className="min-h-svh bg-page">
      <AppHeader />
      <OrderDetailsPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4">
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2.5 text-muted-foreground">
              <Link to={ordersLink}>
                <ArrowLeft />
                Back to orders
              </Link>
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Orders, revenue and status trends for the selected period.</p>
          </div>
        </div>

        <Card className="p-4 shadow-xs sm:p-6">
          <ReportFilters
            from={fromDate}
            to={toDate}
            onFromChange={(d) => updateParams({ from: d ? format(d, DATE_FMT) : undefined })}
            onToChange={(d) => updateParams({ to: d ? format(d, DATE_FMT) : undefined })}
            groupBy={groupBy}
            onGroupByChange={(g) => updateParams({ groupBy: g })}
            sortOrder={sortOrder}
            onSortOrderChange={(o) => updateParams({ sortOrder: o })}
            onClear={() => setSearchParams(new URLSearchParams(), { replace: true })}
            canClear={searchParams.size > 0}
          />
        </Card>

        {summary.error ? (
          <SectionError title="Couldn't load summary" error={summary.error} onRetry={summary.retry} />
        ) : (
          <div className={cn('transition-opacity', summary.loading && summary.data && 'opacity-50')}>
            <StatGrid label="Report summary" titles={SUMMARY_TITLES} icons={SUMMARY_ICONS} values={summaryValues} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Orders & Revenue"
            loading={bars.loading && bars.data !== null}
            description={bars.data ? `Grouped by ${bars.data.groupBy}, ${sortLabel}` : 'Orders and net revenue per period'}
          >
            {bars.error ? (
              <SectionError title="Couldn't load chart" error={bars.error} onRetry={bars.retry} />
            ) : (
              <OrdersRevenueChart report={bars.data} />
            )}
          </ChartCard>

          <ChartCard
            title="Orders by Status"
            loading={pie.loading && pie.data !== null}
            description="Completed, pending, processing, failed and other"
          >
            {pie.error ? (
              <SectionError title="Couldn't load chart" error={pie.error} onRetry={pie.retry} />
            ) : (
              <StatusBreakdownChart report={pie.data} />
            )}
          </ChartCard>
        </div>

        <Card className="gap-5 p-4 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Recent Orders</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The {RECENT_LIMIT} newest orders in this period, {sortLabel}.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={ordersLink}>View all</Link>
            </Button>
          </div>

          {recent.error ? (
            <SectionError title="Couldn't load recent orders" error={recent.error} onRetry={recent.retry} />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <OrdersTable
                rows={recent.data?.data ?? null}
                loading={recent.loading}
                sortBy="createdAt"
                sortOrder={sortOrder}
                onSelectOrder={setSelectedOrderId}
                hasFilters={hasRange}
                onClearFilters={clearRange}
              />
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
