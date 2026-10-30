import { Label, Pie, PieChart } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StatusBreakdownReport, StatusSlice, StatusSliceKey } from '@/types/api';

// Same hues as the status badges
const chartConfig = {
  count: { label: 'Orders' },
  completed: { label: 'Completed', theme: { light: '#16a34a', dark: '#4ade80' } },
  pending: { label: 'Pending', theme: { light: '#d97706', dark: '#fbbf24' } },
  processing: { label: 'Processing', theme: { light: '#2563eb', dark: '#60a5fa' } },
  failed: { label: 'Failed', theme: { light: '#dc2626', dark: '#f87171' } },
  other: { label: 'Other', theme: { light: '#94a3b8', dark: '#64748b' } },
} satisfies ChartConfig;

// Matches chartConfig, for swatches outside the chart (its --color-* vars only exist inside ChartContainer)
const SWATCH: Record<StatusSliceKey, string> = {
  completed: 'bg-green-600 dark:bg-green-400',
  pending: 'bg-amber-600 dark:bg-amber-400',
  processing: 'bg-blue-600 dark:bg-blue-400',
  failed: 'bg-red-600 dark:bg-red-400',
  other: 'bg-slate-400 dark:bg-slate-500',
};

export function StatusBreakdownChart({ report }: { report: StatusBreakdownReport | null }) {
  if (!report) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="size-52 rounded-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (report.totalOrders === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <PieChartIcon className="size-6" aria-hidden />
        No orders in this range
      </div>
    );
  }

  // Empty slices are left out of the donut but still listed below it
  const slices = report.data.filter((s) => s.count > 0).map((s) => ({ ...s, fill: `var(--color-${s.key})` }));

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square h-56 w-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="key"
                formatter={(_value, _name, item) => (
                  <SliceTooltip slice={item.payload as StatusSlice} currency={report.currency} />
                )}
              />
            }
          />
          <Pie data={slices} dataKey="count" nameKey="key" innerRadius={64} outerRadius={100} strokeWidth={3} stroke="var(--card)">
            <Label
              content={({ viewBox }) =>
                viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                      {formatNumber(report.totalOrders)}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                      Orders
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <SliceList slices={report.data} currency={report.currency} />
    </div>
  );
}

function SliceTooltip({ slice, currency }: { slice: StatusSlice; currency: string }) {
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 font-medium">
          <span className={cn('size-2.5 shrink-0 rounded-xs', SWATCH[slice.key])} />
          {slice.label}
        </span>
        <span className="font-mono tabular-nums">
          {formatNumber(slice.count)} ({slice.percentage}%)
        </span>
      </div>
      <div className="flex justify-between gap-4 text-muted-foreground">
        <span>Revenue</span>
        <span className="font-mono tabular-nums">{formatMoney(slice.revenue, currency)}</span>
      </div>
      {slice.key === 'other' && slice.statuses.length > 0 && (
        <p className="max-w-56 text-muted-foreground">{slice.statuses.join(', ')}</p>
      )}
    </div>
  );
}

function SliceList({ slices, currency }: { slices: StatusSlice[]; currency: string }) {
  return (
    <ul className="w-full divide-y divide-sand rounded-lg border border-sand text-sm">
      {slices.map((slice) => (
        <li
          key={slice.key}
          className="flex items-center justify-between gap-3 px-3 py-2"
          title={slice.statuses.length ? slice.statuses.join(', ') : undefined}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn('size-2.5 shrink-0 rounded-xs', SWATCH[slice.key])} aria-hidden />
            <span className="truncate">{slice.label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 tabular-nums">
            <span className="hidden text-muted-foreground sm:inline">{formatMoney(slice.revenue, currency)}</span>
            <span className="w-12 text-right font-medium">{formatNumber(slice.count)}</span>
            <span className="w-14 text-right text-muted-foreground">{slice.percentage}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
