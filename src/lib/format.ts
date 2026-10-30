import type { Address } from '@/types/api';

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number, currency = 'USD'): string {
  const key = currency || 'USD';
  let fmt = moneyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: key });
    moneyFormatters.set(key, fmt);
  }
  return fmt.format(value);
}

const compactMoneyFormatters = new Map<string, Intl.NumberFormat>();

/** "$21.9K" — for chart axes */
export function formatMoneyCompact(value: number, currency = 'USD'): string {
  const key = currency || 'USD';
  let fmt = compactMoneyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: key, notation: 'compact' });
    compactMoneyFormatters.set(key, fmt);
  }
  return fmt.format(value);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/** Display format for dates across the app (date-fns tokens), US style e.g. "07/14/25" */
export const DISPLAY_DATE_FMT = 'MM/dd/yy';

const pad2 = (n: number) => String(n).padStart(2, '0');

// createdAt holds the store's wall-clock time saved as UTC, so format in UTC to keep the day stable.
function utcDate(d: Date): string {
  return `${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}/${pad2(d.getUTCFullYear() % 100)}`;
}

const utcTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** "07/14/25" (mm/dd/yy) */
export function formatUtcDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : utcDate(d);
}

/** "07/14/25, 11:03 AM" — UTC for the same reason as formatUtcDate */
export function formatUtcDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : `${utcDate(d)}, ${utcTimeFormatter.format(d)}`;
}

/** One-line address; empty when nothing is known */
export function formatAddress(address: Partial<Address> | null | undefined): string {
  if (!address) return '';
  if (address.full) return address.full;
  return [address.line1, address.line2, address.city, address.state, address.postcode, address.country]
    .filter(Boolean)
    .join(', ');
}

export function formatLocation(address: Address | null | undefined): string {
  if (!address) return '-';
  const parts = [address.city, address.state].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? parts.join(', ') : '-';
}
