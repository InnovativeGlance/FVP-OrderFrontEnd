import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GREEN = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30';
const TEAL = 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30';
const AMBER = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30';
const SLATE = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30';
const BLUE = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30';
const RED = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30';

const STATUS_CLASSES: Record<string, string> = {
  Completed: GREEN,
  'Completed (Partial refund)': TEAL,
  'Pending payment': AMBER,
  'On hold': AMBER,
  Quote: BLUE,
  'Purchase order': BLUE,
  'Purchase Orders (Awaiting Payment)': AMBER,
  'Purchase Order (Waiting To Ship)': BLUE,
  Draft: SLATE,
  Cancelled: RED,
  Failed: RED,
  Refunded: RED,
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', STATUS_CLASSES[status] ?? SLATE)}>
      {status}
    </Badge>
  );
}
