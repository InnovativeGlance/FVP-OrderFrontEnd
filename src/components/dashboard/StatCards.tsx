import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarRange, DollarSign, RotateCcw, ShoppingCart, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, isAbortError } from '@/lib/api-client';
import { formatMoney, formatNumber, formatUtcDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getDashboardCards } from '@/services/dashboard.service';
import type { DashboardCards } from '@/types/api';

interface StatItem {
  title: string;
  value: string;
}

// Icon chip colours, in card order
const TONES = [
  'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
];

const TITLES = ['Total Orders', 'Total Revenue', 'Refunds Issued', 'Order Date Range'];
const ICONS = [ShoppingCart, DollarSign, RotateCcw, CalendarRange];

function toItems(cards: DashboardCards): StatItem[] {
  const { from, to } = cards.orderDateRange;
  const values = [
    formatNumber(cards.totalOrders),
    formatMoney(cards.totalRevenue, cards.currency),
    `${formatNumber(cards.refundsIssued.count)} (${formatMoney(cards.refundsIssued.amount, cards.currency)})`,
    from && to ? `${formatUtcDate(from)} – ${formatUtcDate(to)}` : '-',
  ];
  return TITLES.map((title, i) => ({ title, value: values[i] }));
}

export function StatCards() {
  const [cards, setCards] = useState<DashboardCards | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getDashboardCards(controller.signal)
      .then((data) => {
        setCards(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        if (err instanceof ApiError && err.status === 401) return;
        const message = err instanceof Error ? err.message : 'Failed to load stats';
        setError(message);
        if (err instanceof ApiError && err.status === 0) toast.error(message, { id: 'network-error' });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setCards(null);
    setAttempt((n) => n + 1);
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Couldn't load dashboard stats</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const items = cards ? toItems(cards) : null;

  return <StatGrid label="Order statistics" titles={TITLES} icons={ICONS} values={items?.map((item) => item.value) ?? null} />;
}

interface StatGridProps {
  label: string;
  titles: readonly string[];
  icons: readonly LucideIcon[];
  /** One per title, in the same order; null while loading */
  values: readonly string[] | null;
}

/** Four-up row of stat cards; shared by the dashboard and the customer page */
export function StatGrid({ label, titles, icons, values }: StatGridProps) {
  return (
    <section aria-label={label} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {titles.map((title, i) => {
        const Icon = icons[i];
        return (
          <Card key={title} className="gap-3 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <span
                className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5', TONES[i % TONES.length])}
                aria-hidden
              >
                <Icon />
              </span>
            </CardHeader>
            <CardContent>
              {values ? (
                <p className="text-xl font-semibold tracking-tight tabular-nums">{values[i]}</p>
              ) : (
                <Skeleton className="h-8 w-3/4" />
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
