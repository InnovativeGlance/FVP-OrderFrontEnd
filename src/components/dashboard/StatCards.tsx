import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarRange, DollarSign, RotateCcw, ShoppingCart } from 'lucide-react';
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
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-rose-50 text-rose-600',
  'bg-violet-50 text-violet-600',
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

  return (
    <section aria-label="Order statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {(items ?? TITLES.map((title) => ({ title, value: '' }))).map((item, i) => {
        const Icon = ICONS[i];
        return (
          <Card key={item.title} className="gap-3 bg-white shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <span
                className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5', TONES[i])}
                aria-hidden
              >
                <Icon />
              </span>
            </CardHeader>
            <CardContent>
              {items ? (
                <p className="text-xl font-semibold tracking-tight tabular-nums">{item.value}</p>
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
