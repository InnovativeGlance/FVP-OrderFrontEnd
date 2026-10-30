import { useState } from 'react';
import { format, startOfDay } from 'date-fns';
import type { Matcher } from 'react-day-picker';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DISPLAY_DATE_FMT } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
  /** Dates before this are disabled */
  minDate?: Date;
  /** Dates after this are disabled (future dates are always disabled) */
  maxDate?: Date;
  'aria-label'?: string;
}

export function DatePicker({ id, value, onChange, placeholder, minDate, maxDate, ...rest }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [today] = useState(() => startOfDay(new Date()));

  const disabled: Matcher[] = [{ after: today }];
  if (maxDate) disabled.push({ after: maxDate });
  if (minDate) disabled.push({ before: minDate });

  return (
    <div className="relative w-full sm:w-44">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            aria-label={rest['aria-label']}
            className={cn('w-full justify-start font-normal', value && 'pr-8', !value && 'text-muted-foreground')}
          >
            <CalendarIcon />
            <span className="truncate">{value ? format(value, DISPLAY_DATE_FMT) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value ?? maxDate ?? minDate}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(2010, 0)}
            endMonth={today}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
      {value && (
        // Sibling of the trigger (not nested) so it's a valid, separately focusable button.
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={`Clear ${placeholder.toLowerCase()}`}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
