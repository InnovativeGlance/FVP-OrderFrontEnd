import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGE_SIZES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { Pagination as PaginationInfo } from '@/types/api';

interface PaginationProps {
  pagination: PaginationInfo | null;
  limit: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({ pagination, limit, disabled, onPageChange, onLimitChange }: PaginationProps) {
  const page = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 0;
  const totalItems = pagination?.totalItems ?? 0;
  const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);
  const canPrev = Boolean(pagination?.hasPrevPage) && !disabled;
  const canNext = Boolean(pagination?.hasNextPage) && !disabled;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {pagination
          ? totalItems === 0
            ? 'Showing 0 orders'
            : `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(totalItems)} orders`
          : ' '}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="rows-per-page" className="text-sm font-normal whitespace-nowrap text-muted-foreground">
            Rows per page
          </Label>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger id="rows-per-page" size="sm" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(1)} disabled={!canPrev} aria-label="First page">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={!canPrev} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <span className="px-2 text-sm whitespace-nowrap tabular-nums">
            Page {formatNumber(totalPages === 0 ? 0 : page)} of {formatNumber(totalPages)}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={!canNext} aria-label="Next page">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(totalPages)} disabled={!canNext} aria-label="Last page">
            <ChevronsRight />
          </Button>
        </nav>
      </div>
    </div>
  );
}
