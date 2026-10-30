import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format';
import type { OrdersRevenueReport } from '@/types/api';

// Brand green for orders, brand gold for revenue
const chartConfig = {
  totalOrders: { label: 'Orders', theme: { light: '#334e3b', dark: '#7fae8b' } },
  totalRevenue: { label: 'Revenue', theme: { light: '#d4a84b', dark: '#d4a84b' } },
} satisfies ChartConfig;

export function OrdersRevenueChart({ report }: { report: OrdersRevenueReport | null }) {
  if (!report) return <Skeleton className="h-80 w-full" />;

  if (report.data.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <BarChart3 className="size-6" aria-hidden />
        No orders in this range
      </div>
    );
  }

  const { currency } = report;

  // Orders (a count) and revenue (dollars) have very different scales, so each gets its own Y axis.
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
      <BarChart data={report.data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis
          yAxisId="orders"
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          yAxisId="revenue"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2.5 shrink-0 rounded-xs" style={{ backgroundColor: item.color }} />
                    {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {name === 'totalRevenue' ? formatMoney(Number(value), currency) : formatNumber(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="orders" dataKey="totalOrders" fill="var(--color-totalOrders)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="revenue" dataKey="totalRevenue" fill="var(--color-totalRevenue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
