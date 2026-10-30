# Frontend: Reports Analytics page

How to build the **Reports Analytics** page with [shadcn/ui charts](https://ui.shadcn.com/docs/components/chart) (Recharts under the hood).

What the user sees:

1. On the dashboard, a **Reports Analytics** button that opens `/reports`.
2. On `/reports`: a filter bar (date range, sort order, group by), summary cards, then two charts side by side (**bar chart** for orders + revenue, **pie chart** for orders by status), then the **10 most recent orders**.

Every request on the page uses the same filters, so changing the date range or sort order refreshes the cards, both charts and the list together.

---

## 1. API

All endpoints need `Authorization: Bearer <accessToken>` (see [FRONTEND_AUTH.md](FRONTEND_AUTH.md)). On `401`, clear the token and go to login.

### Shared query params

| Param | Default | Notes |
| --- | --- | --- |
| `from` / `to` | (none) | `YYYY-MM-DD`, inclusive, UTC days. Leave out for all time. |
| `status`, `search`, `customerEmail` | (none) | Optional. Same rules as `GET /api/orders`. |
| `sortOrder` | depends on endpoint | `asc` or `desc` (not used by `/summary`) |

### `GET /api/reports/summary`: cards

```json
{
  "totalRevenue": 147962.18,
  "totalOrders": 215,
  "totalCustomers": 176,
  "averageOrderValue": 736.13,
  "completedOrders": 199,
  "pendingOrders": 1,
  "processingOrders": 0,
  "failedOrders": 0,
  "refundsIssued": { "count": 4, "amount": 2487.42 },
  "orderDateRange": { "from": "2025-01-01T15:24:07.000Z", "to": "2025-06-30T15:23:22.000Z" },
  "currency": "USD"
}
```

`totalRevenue` is net revenue (paid / invoiced orders minus refunds), the same number as the dashboard cards. `totalCustomers` counts distinct billing emails.

### `GET /api/reports/orders-revenue`: bar chart

Extra params: `groupBy` = `auto` (default) | `day` | `week` | `month` | `year`, and `sortOrder` (default `asc`, oldest period first).

`auto` picks `day` for ranges up to 31 days, `week` up to 180 days, `month` up to 3 years, and `year` beyond that. Periods with no orders come back as zeros, so the bars have no gaps. If a manual `groupBy` would produce more than 1000 bars, the API returns `400`.

```json
{
  "groupBy": "month",
  "sortOrder": "asc",
  "data": [
    { "period": "2025-01-01", "label": "Jan 2025", "totalOrders": 33, "totalRevenue": 21950.1 },
    { "period": "2025-02-01", "label": "Feb 2025", "totalOrders": 29, "totalRevenue": 18044.7 }
  ],
  "currency": "USD"
}
```

### `GET /api/reports/status-breakdown`: pie chart

Extra param: `sortOrder` (default `desc`, largest slice first). `data` always has the 5 slices below. `statuses` holds the raw per-status counts, useful for a tooltip or drill-down.

| `key` | Includes |
| --- | --- |
| `completed` | Completed, Completed (Partial refund) |
| `pending` | Pending payment |
| `processing` | Processing |
| `failed` | Failed |
| `other` | Everything else (On hold, Cancelled, Refunded, Quote, Purchase order, Draft, …) |

```json
{
  "totalOrders": 215,
  "sortOrder": "desc",
  "data": [
    { "key": "completed", "label": "Completed", "count": 199, "percentage": 92.6, "revenue": 145100.2, "statuses": ["Completed", "Completed (Partial refund)"] },
    { "key": "other", "label": "Other", "count": 15, "percentage": 7, "revenue": 2861.98, "statuses": ["On hold", "Cancelled"] },
    { "key": "pending", "label": "Pending", "count": 1, "percentage": 0.5, "revenue": 0, "statuses": ["Pending payment"] },
    { "key": "processing", "label": "Processing", "count": 0, "percentage": 0, "revenue": 0, "statuses": ["Processing"] },
    { "key": "failed", "label": "Failed", "count": 0, "percentage": 0, "revenue": 0, "statuses": ["Failed"] }
  ],
  "statuses": [{ "status": "Completed", "count": 195, "percentage": 90.7, "revenue": 143000.5 }],
  "currency": "USD"
}
```

### `GET /api/reports/recent-orders`: recent orders

Extra params: `limit` (default `10`, max `50`) and `sortOrder` (default `desc`). The API always picks the **newest** `limit` orders in the range. `sortOrder` only changes the order they are listed in (`asc` puts the oldest of those 10 first). Each row has the same shape as a `GET /api/orders` row.

```json
{
  "data": [
    {
      "orderId": 185785,
      "createdAt": "2025-06-30T15:23:22.000Z",
      "customer": { "name": "Steve Mays", "company": "Mays Consulting", "email": "smays@mces.com", "phone": "740-363-9511", "address": { "city": "Delaware", "state": "OH" } },
      "itemsTotalQty": 2,
      "total": 245.98,
      "currency": "USD",
      "status": "Completed"
    }
  ],
  "sortOrder": "desc",
  "limit": 10
}
```

---

## 2. Install shadcn components

```bash
npx shadcn@latest add chart card button table badge select popover calendar skeleton
```

`chart` installs `recharts` and `components/ui/chart.tsx` (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`). Chart colours come from the `--chart-1` … `--chart-5` CSS variables that shadcn adds to `globals.css` for light and dark themes.

---

## 3. Types and API client

`src/features/reports/api.ts`

```ts
export type SortOrder = "asc" | "desc";
export type GroupBy = "auto" | "day" | "week" | "month" | "year";

export interface ReportFilters {
  from?: string; // YYYY-MM-DD
  to?: string;
  sortOrder: SortOrder;
  groupBy: GroupBy;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
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

export interface OrdersRevenue {
  groupBy: Exclude<GroupBy, "auto">;
  sortOrder: SortOrder;
  data: { period: string; label: string; totalOrders: number; totalRevenue: number }[];
  currency: string;
}

export type SliceKey = "completed" | "pending" | "processing" | "failed" | "other";

export interface StatusBreakdown {
  totalOrders: number;
  sortOrder: SortOrder;
  data: { key: SliceKey; label: string; count: number; percentage: number; revenue: number; statuses: string[] }[];
  statuses: { status: string; count: number; percentage: number; revenue: number }[];
  currency: string;
}

export interface RecentOrder {
  orderId: number;
  createdAt: string;
  customer: { name: string | null; company: string | null; email: string | null };
  itemsTotalQty: number;
  total: number;
  currency: string;
  status: string;
}

const API_URL = import.meta.env.VITE_API_URL; // e.g. http://localhost:5000

async function get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const res = await fetch(`${API_URL}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "Request failed");
  return body as T;
}

export const reportsApi = {
  summary: (f: ReportFilters) => get<ReportSummary>("/api/reports/summary", { from: f.from, to: f.to }),
  ordersRevenue: (f: ReportFilters) =>
    get<OrdersRevenue>("/api/reports/orders-revenue", { from: f.from, to: f.to, groupBy: f.groupBy, sortOrder: f.sortOrder }),
  statusBreakdown: (f: ReportFilters) =>
    get<StatusBreakdown>("/api/reports/status-breakdown", { from: f.from, to: f.to, sortOrder: f.sortOrder }),
  recentOrders: (f: ReportFilters) =>
    get<{ data: RecentOrder[] }>("/api/reports/recent-orders", { from: f.from, to: f.to, sortOrder: f.sortOrder, limit: 10 }),
};

export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });
export const num = new Intl.NumberFormat("en-US");
```

If the app already has an axios instance or React Query, use it instead of `get`. Use one query key per endpoint plus the filters, e.g. `["reports", "summary", filters]`.

---

## 4. Dashboard button

Add the button to the dashboard page header (next to the title or the export button):

```tsx
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigate = useNavigate();

<Button onClick={() => navigate("/reports")}>
  <BarChart3 className="mr-2 h-4 w-4" />
  Reports Analytics
</Button>
```

Register the route inside the same protected layout as the dashboard:

```tsx
<Route path="/reports" element={<ReportsPage />} />
```

To carry the dashboard's current date range over, navigate with `navigate(\`/reports?from=${from}&to=${to}\`)`. The page reads its filters from the URL.

---

## 5. Page: `ReportsPage`

`src/features/reports/ReportsPage.tsx`

The filters live in the URL (`?from=&to=&sortOrder=&groupBy=`), so a refresh or a shared link keeps them. All four requests run in parallel and run again whenever the filters change.

```tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  reportsApi, type ReportFilters, type ReportSummary, type OrdersRevenue,
  type StatusBreakdown, type RecentOrder, type SortOrder, type GroupBy,
} from "./api";
import { ReportFiltersBar } from "./ReportFiltersBar";
import { SummaryCards } from "./SummaryCards";
import { OrdersRevenueBarChart } from "./OrdersRevenueBarChart";
import { StatusPieChart } from "./StatusPieChart";
import { RecentOrdersTable } from "./RecentOrdersTable";

interface ReportData {
  summary: ReportSummary;
  bars: OrdersRevenue;
  pie: StatusBreakdown;
  recent: RecentOrder[];
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const filters: ReportFilters = useMemo(
    () => ({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      sortOrder: (params.get("sortOrder") as SortOrder) ?? "desc",
      groupBy: (params.get("groupBy") as GroupBy) ?? "auto",
    }),
    [params]
  );

  const setFilters = (next: Partial<ReportFilters>) => {
    const merged = { ...filters, ...next };
    const p = new URLSearchParams();
    if (merged.from) p.set("from", merged.from);
    if (merged.to) p.set("to", merged.to);
    p.set("sortOrder", merged.sortOrder);
    p.set("groupBy", merged.groupBy);
    setParams(p, { replace: true });
  };

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // One sortOrder for everything: desc = newest period / largest slice / newest order first.
    Promise.all([
      reportsApi.summary(filters),
      reportsApi.ordersRevenue(filters),
      reportsApi.statusBreakdown(filters),
      reportsApi.recentOrders(filters),
    ])
      .then(([summary, bars, pie, recent]) => {
        if (!cancelled) setData({ summary, bars, pie, recent: recent.data });
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Reports Analytics</h1>
        </div>
        <ReportFiltersBar filters={filters} onChange={setFilters} />
      </div>

      {error && <p className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">{error}</p>}

      <SummaryCards summary={data?.summary} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <OrdersRevenueBarChart data={data?.bars} loading={loading} />
        <StatusPieChart data={data?.pie} loading={loading} />
      </div>

      <RecentOrdersTable orders={data?.recent} loading={loading} />
    </div>
  );
}
```

---

## 6. Filter bar

`src/features/reports/ReportFiltersBar.tsx`: a shadcn date-range picker (`Popover` + `Calendar mode="range"`) plus two `Select`s.

```tsx
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportFilters, SortOrder, GroupBy } from "./api";

// Calendar dates are local; send the picked day as-is (YYYY-MM-DD).
const toDay = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : undefined);
const fromDay = (s?: string) => (s ? new Date(`${s}T00:00:00`) : undefined);

export function ReportFiltersBar({ filters, onChange }: { filters: ReportFilters; onChange: (f: Partial<ReportFilters>) => void }) {
  const range: DateRange | undefined = filters.from || filters.to ? { from: fromDay(filters.from), to: fromDay(filters.to) } : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[260px] justify-start font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {range?.from
              ? `${format(range.from, "MMM d, yyyy")} – ${range.to ? format(range.to, "MMM d, yyyy") : "…"}`
              : "All time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={(r) => onChange({ from: toDay(r?.from), to: toDay(r?.to ?? r?.from) })}
          />
          <div className="flex justify-end border-t p-2">
            <Button variant="ghost" size="sm" onClick={() => onChange({ from: undefined, to: undefined })}>
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Select value={filters.groupBy} onValueChange={(v) => onChange({ groupBy: v as GroupBy })}>
        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto</SelectItem>
          <SelectItem value="day">Daily</SelectItem>
          <SelectItem value="week">Weekly</SelectItem>
          <SelectItem value="month">Monthly</SelectItem>
          <SelectItem value="year">Yearly</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sortOrder} onValueChange={(v) => onChange({ sortOrder: v as SortOrder })}>
        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Newest first</SelectItem>
          <SelectItem value="asc">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

Quick presets (Last 7 days, Last 30 days, This year) are just `onChange({ from, to })` calls with computed dates.

---

## 7. Summary cards

`src/features/reports/SummaryCards.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { num, usd, type ReportSummary } from "./api";

export function SummaryCards({ summary, loading }: { summary?: ReportSummary; loading: boolean }) {
  const cards = [
    { title: "Total revenue", value: summary && usd.format(summary.totalRevenue) },
    { title: "Total orders", value: summary && num.format(summary.totalOrders) },
    { title: "Total customers", value: summary && num.format(summary.totalCustomers) },
    { title: "Avg. order value", value: summary && usd.format(summary.averageOrderValue) },
    { title: "Completed", value: summary && num.format(summary.completedOrders) },
    { title: "Pending", value: summary && num.format(summary.pendingOrders) },
    { title: "Processing", value: summary && num.format(summary.processingOrders) },
    { title: "Refunds", value: summary && `${usd.format(summary.refundsIssued.amount)} (${summary.refundsIssued.count})` },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !summary ? <Skeleton className="h-7 w-24" /> : <div className="text-2xl font-semibold tabular-nums">{c.value}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 8. Bar chart: total orders + total revenue

`src/features/reports/OrdersRevenueBarChart.tsx`

Orders (a count) and revenue (dollars) have very different scales, so each gets its own Y axis: orders on the left, revenue on the right.

```tsx
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { num, usd, usdCompact, type OrdersRevenue } from "./api";

const chartConfig = {
  totalOrders: { label: "Orders", color: "var(--chart-1)" },
  totalRevenue: { label: "Revenue", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function OrdersRevenueBarChart({ data, loading }: { data?: OrdersRevenue; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders &amp; revenue</CardTitle>
        <CardDescription>{data ? `Grouped by ${data.groupBy}` : " "}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.data.length === 0 ? (
          <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No orders in this range</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={data.data} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis yAxisId="orders" tickLine={false} axisLine={false} width={40} tickFormatter={(v) => num.format(v)} />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) => usdCompact.format(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig].label}</span>
                        <span className="font-mono tabular-nums">
                          {name === "totalRevenue" ? usd.format(Number(value)) : num.format(Number(value))}
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
        )}
      </CardContent>
    </Card>
  );
}
```

`ChartContainer` turns each `chartConfig` key into a `--color-<key>` CSS variable, which is why the bars use `var(--color-totalOrders)`.

---

## 9. Pie chart: orders by status

`src/features/reports/StatusPieChart.tsx`: a donut with the total in the middle. Slices with `count: 0` are dropped so they don't leave empty legend entries.

```tsx
import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { num, type StatusBreakdown } from "./api";

const chartConfig = {
  count: { label: "Orders" },
  completed: { label: "Completed", color: "var(--chart-2)" },
  pending: { label: "Pending", color: "var(--chart-4)" },
  processing: { label: "Processing", color: "var(--chart-1)" },
  failed: { label: "Failed", color: "var(--destructive)" },
  other: { label: "Other", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function StatusPieChart({ data, loading }: { data?: StatusBreakdown; loading: boolean }) {
  const slices = (data?.data ?? []).filter((s) => s.count > 0).map((s) => ({ ...s, fill: `var(--color-${s.key})` }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders by status</CardTitle>
        <CardDescription>Completed, pending, processing, failed and other</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <Skeleton className="mx-auto h-[300px] w-[300px] rounded-full" />
        ) : data.totalOrders === 0 ? (
          <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No orders in this range</p>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto h-[300px] w-full">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="key"
                    formatter={(value, _name, item) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">{item.payload.label}</span>
                        <span className="font-mono tabular-nums">
                          {num.format(Number(value))} ({item.payload.percentage}%)
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie data={slices} dataKey="count" nameKey="key" innerRadius={70} strokeWidth={4}>
                <Label
                  content={({ viewBox }) =>
                    viewBox && "cx" in viewBox ? (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                          {num.format(data.totalOrders)}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                          Orders
                        </tspan>
                      </text>
                    ) : null
                  }
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" />} className="flex-wrap gap-2" />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

The slices arrive already sorted by `sortOrder`. To show which raw statuses make up "Other", list `data.statuses` under the chart or read `slice.statuses` in the tooltip.

---

## 10. Recent orders table

`src/features/reports/RecentOrdersTable.tsx`

```tsx
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usd, type RecentOrder } from "./api";

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" =>
  s.startsWith("Completed") ? "default" : s === "Failed" || s === "Cancelled" ? "destructive" : s === "Processing" ? "secondary" : "outline";

// Order dates are stored as UTC wall-clock store time, so format in UTC.
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function RecentOrdersTable({ orders, loading }: { orders?: RecentOrder[]; loading: boolean }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent orders</CardTitle>
        <button className="text-sm text-muted-foreground hover:underline" onClick={() => navigate("/orders")}>
          View all
        </button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || !orders
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              : orders.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No orders in this range</TableCell>
                  </TableRow>
                )
              : orders.map((o) => (
                  <TableRow key={o.orderId} className="cursor-pointer" onClick={() => navigate(`/orders/${o.orderId}`)}>
                    <TableCell className="font-medium">#{o.orderId}</TableCell>
                    <TableCell className="whitespace-nowrap">{date.format(new Date(o.createdAt))}</TableCell>
                    <TableCell>
                      <div>{o.customer.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.customer.email}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{o.itemsTotalQty}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd.format(o.total)}</TableCell>
                    <TableCell><Badge variant={statusVariant(o.status)}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

## 11. Checklist

- [ ] Dashboard shows a **Reports Analytics** button that opens `/reports`.
- [ ] Changing the date range refreshes the cards, both charts and the recent orders.
- [ ] Sort order flips the bar periods, the pie slice order and the recent list together.
- [ ] Group by Auto / Daily / Weekly / Monthly / Yearly changes the bars. A `400` for too many bars shows its `message`.
- [ ] Empty ranges show "No orders in this range" instead of a broken chart.
- [ ] Charts look right in light and dark mode (they use the `--chart-*` theme variables).
- [ ] On mobile the charts stack (`lg:grid-cols-2`) and the table scrolls horizontally.
