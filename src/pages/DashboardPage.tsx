import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isValid, parse } from 'date-fns';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { ExportButton } from '@/components/orders/ExportButton';
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Pagination } from '@/components/orders/Pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { ApiError, isAbortError } from '@/lib/api-client';
import { PAGE_SIZES } from '@/lib/constants';
import { getOrders } from '@/services/orders.service';
import type { OrderStatus, OrdersQuery, OrdersResponse, SortBy, SortOrder } from '@/types/api';

const DEFAULT_SORT_BY: SortBy = 'createdAt';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';
const DEFAULT_LIMIT = 10;
const DATE_FMT = 'yyyy-MM-dd';

const SORT_KEYS: readonly SortBy[] = [
  'orderId',
  'createdAt',
  'customerName',
  'email',
  'location',
  'itemsTotalQty',
  'total',
  'status',
];

type ParamKey = 'search' | 'status' | 'from' | 'to' | 'sortBy' | 'sortOrder' | 'page' | 'limit';

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, DATE_FMT, new Date());
  return isValid(d) ? d : undefined;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Filter state lives in the URL ----
  const urlSearch = searchParams.get('search') ?? '';
  const status = searchParams.get('status') || undefined;
  const fromDate = parseDateParam(searchParams.get('from'));
  const toDate = parseDateParam(searchParams.get('to'));
  const sortByParam = searchParams.get('sortBy') as SortBy | null;
  const sortBy: SortBy = sortByParam && SORT_KEYS.includes(sortByParam) ? sortByParam : DEFAULT_SORT_BY;
  const sortOrder: SortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const limitParam = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);
  const limit = (PAGE_SIZES as readonly number[]).includes(limitParam) ? limitParam : DEFAULT_LIMIT;

  const from = fromDate ? format(fromDate, DATE_FMT) : undefined;
  const to = toDate ? format(toDate, DATE_FMT) : undefined;

  /** Merge changes into the URL; defaults are dropped to keep links short. Resets page unless it's being set. */
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
        { replace: opts.replace },
      );
    },
    [setSearchParams],
  );

  // ---- Search input: local for instant typing, debounced into the URL ----
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    // URL changed from outside the input (clear filters, back/forward) — mirror it.
    setSyncedUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next !== urlSearch.trim()) updateParams({ search: next }, { replace: true });
    // only react to the debounced value, not to URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ---- Orders fetch ----
  const query = useMemo<OrdersQuery>(
    () => ({
      page,
      limit,
      search: urlSearch.trim() || undefined,
      status: status as OrderStatus | undefined,
      from,
      to,
      sortBy,
      sortOrder,
    }),
    [page, limit, urlSearch, status, from, to, sortBy, sortOrder],
  );
  // Same filters and sort as the table, without pagination (the export holds every matching order)
  const { page: _page, limit: _limit, ...exportQuery } = query;

  const [result, setResult] = useState<OrdersResponse | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Abort the previous request so an older response can never overwrite a newer one.
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

  const handleClear = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const canClear = searchParams.size > 0 || searchInput !== '';
  const hasFilters = Boolean(urlSearch.trim() || status || from || to);

  return (
    <div className="min-h-svh bg-page">
      <AppHeader />
      <OrderDetailsPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search, filter and review orders synced from the store.</p>
        </div>

        <StatCards />

        <Card className="gap-5 p-4 shadow-xs sm:p-6">
          <OrderFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            status={status}
            onStatusChange={(s) => updateParams({ status: s })}
            from={fromDate}
            to={toDate}
            onFromChange={(d) => updateParams({ from: d ? format(d, DATE_FMT) : undefined })}
            onToChange={(d) => updateParams({ to: d ? format(d, DATE_FMT) : undefined })}
            onClear={handleClear}
            canClear={canClear}
            actions={
              <ExportButton
                query={exportQuery}
                disabled={!result || result.pagination.totalItems === 0}
                className="sm:self-end"
              />
            }
          />

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
            {/* With nothing loaded yet, the error alert above replaces the skeleton */}
            {!(error && !result) && (
              <OrdersTable
                rows={result?.data ?? null}
                loading={loading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onSelectOrder={setSelectedOrderId}
                hasFilters={hasFilters}
                onClearFilters={handleClear}
              />
            )}
            {/* Refetching over existing rows (first load shows the skeleton instead) */}
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
      </main>
    </div>
  );
}
