import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/orders/DatePicker';
import type { ReportGroupBy, SortOrder } from '@/types/api';

const GROUP_BY_OPTIONS: { value: ReportGroupBy; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

interface ReportFiltersProps {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (date: Date | undefined) => void;
  onToChange: (date: Date | undefined) => void;
  groupBy: ReportGroupBy;
  onGroupByChange: (value: ReportGroupBy) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  onClear: () => void;
  canClear: boolean;
}

export function ReportFilters({
  from,
  to,
  onFromChange,
  onToChange,
  groupBy,
  onGroupByChange,
  sortOrder,
  onSortOrderChange,
  onClear,
  canClear,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-from">From</Label>
          <DatePicker id="report-from" value={from} onChange={onFromChange} placeholder="From date" maxDate={to} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-to">To</Label>
          <DatePicker id="report-to" value={to} onChange={onToChange} placeholder="To date" minDate={from} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-group-by">Group by</Label>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as ReportGroupBy)}>
            <SelectTrigger id="report-group-by" className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-sort">Sort</Label>
          <Select value={sortOrder} onValueChange={(v) => onSortOrderChange(v as SortOrder)}>
            <SelectTrigger id="report-sort" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button variant="outline" onClick={onClear} disabled={!canClear} className="sm:self-end">
        <FilterX />
        Clear filters
      </Button>
    </div>
  );
}
