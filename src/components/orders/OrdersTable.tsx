import { ArrowDown, ArrowUp, ArrowUpDown, FilterX, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatLocation, formatMoney, formatNumber, formatUtcDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OrderListItem, SortBy, SortOrder } from '@/types/api';
import { StatusBadge } from './StatusBadge';

interface Column {
  key: SortBy;
  label: string;
  align?: 'right';
}

const COLUMNS: Column[] = [
  { key: 'orderId', label: 'Order #' },
  { key: 'createdAt', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'email', label: 'Email / Phone' },
  { key: 'location', label: 'Location' },
  { key: 'itemsTotalQty', label: 'Items', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status' },
];

const SKELETON_ROWS = 10;

interface OrdersTableProps {
  rows: OrderListItem[] | null;
  loading: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSort: (key: SortBy) => void;
  onSelectOrder: (orderId: number) => void;
  /** Whether any search/status/date filter is active — changes the empty-state copy */
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function OrdersTable({
  rows,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onSelectOrder,
  hasFilters,
  onClearFilters,
}: OrdersTableProps) {
  const showSkeleton = rows === null;

  return (
    <Table
      aria-busy={loading}
      className="min-w-[960px] bg-card [&_td]:px-4 [&_td]:py-3 [&_th]:h-11 [&_th]:px-4 [&_tbody_tr]:border-sand"
    >
      <TableHeader className="bg-sand-50">
        <TableRow className="border-sand hover:bg-transparent">
          {COLUMNS.map((col) => {
            const active = sortBy === col.key;
            const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
            return (
              <TableHead
                key={col.key}
                aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={cn(col.align === 'right' && 'text-right')}
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className={cn(
                    '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-semibold tracking-wide uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {col.label}
                  <Icon className={cn('size-3.5', !active && 'opacity-40')} aria-hidden />
                </button>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody className={cn('transition-opacity', loading && !showSkeleton && 'pointer-events-none opacity-50')}>
        {showSkeleton &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <TableRow key={i}>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} className={cn(col.align === 'right' && 'text-right')}>
                  <Skeleton className={cn('h-4', col.align === 'right' ? 'ml-auto w-12' : 'w-24')} />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {rows?.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={COLUMNS.length} className="py-16">
              <div className="flex flex-col items-center gap-3 text-center whitespace-normal">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <PackageSearch className="size-6" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">{hasFilters ? 'No matching orders' : 'No orders yet'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasFilters
                      ? 'No orders match your search, status or date range. Try adjusting them or clear your filters.'
                      : 'Orders will appear here once they are synced.'}
                  </p>
                </div>
                {hasFilters && onClearFilters && (
                  <Button variant="outline" size="sm" onClick={onClearFilters}>
                    <FilterX />
                    Clear filters
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        )}

        {rows?.map((order) => {
          const { customer } = order;
          return (
            <TableRow
              key={order.orderId}
              tabIndex={0}
              aria-label={`View details for order ${order.orderId}`}
              onClick={() => onSelectOrder(order.orderId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectOrder(order.orderId);
                }
              }}
              className="cursor-pointer hover:bg-sand-50 focus-visible:bg-sand-50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <TableCell className="font-semibold">#{order.orderId}</TableCell>
              <TableCell className="whitespace-nowrap">{formatUtcDate(order.createdAt)}</TableCell>
              <TableCell className="max-w-56">
                <div className="truncate font-medium">{customer.name || '-'}</div>
                {customer.company && (
                  <div className="truncate text-xs text-muted-foreground">{customer.company}</div>
                )}
              </TableCell>
              <TableCell className="max-w-64">
                <div className="truncate">{customer.email || '-'}</div>
                {customer.phone && <div className="truncate text-xs text-muted-foreground">{customer.phone}</div>}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatLocation(customer.address)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(order.itemsTotalQty)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(order.total, order.currency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
