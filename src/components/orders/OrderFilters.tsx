import { useEffect, useState } from 'react';
import { FilterX, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, isAbortError } from '@/lib/api-client';
import { getStatuses } from '@/services/orders.service';
import type { OrderStatus } from '@/types/api';
import { DatePicker } from './DatePicker';

// Radix Select can't use '' as an item value, so "All" gets a sentinel.
const ALL = '__all__';

interface OrderFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string | undefined;
  onStatusChange: (value: OrderStatus | undefined) => void;
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (date: Date | undefined) => void;
  onToChange: (date: Date | undefined) => void;
  onClear: () => void;
  canClear: boolean;
}

export function OrderFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  canClear,
}: OrderFiltersProps) {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getStatuses(controller.signal)
      .then((res) => setStatuses(res.data))
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        if (err instanceof ApiError && err.status === 401) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load statuses', { id: 'network-error' });
      });
    return () => controller.abort();
  }, []);

  // Keep a status from the URL selectable even before (or if) the list loads.
  const statusOptions = status && !statuses.includes(status as OrderStatus) ? [...statuses, status] : statuses;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-64">
        <Label htmlFor="order-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="order-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, phone, order #, address, product…"
            className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="order-status">Status</Label>
        <Select
          value={status ?? ALL}
          onValueChange={(v) => onStatusChange(v === ALL ? undefined : (v as OrderStatus))}
        >
          <SelectTrigger id="order-status" className="w-full sm:w-52">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-from">From</Label>
          <DatePicker id="order-from" value={from} onChange={onFromChange} placeholder="From date" maxDate={to} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-to">To</Label>
          <DatePicker id="order-to" value={to} onChange={onToChange} placeholder="To date" minDate={from} />
        </div>
      </div>

      <Button variant="outline" onClick={onClear} disabled={!canClear} className="sm:self-end">
        <FilterX />
        Clear filters
      </Button>
    </div>
  );
}
