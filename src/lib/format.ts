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

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

// createdAt holds the store's wall-clock time saved as UTC, so format in UTC to keep the day stable.
const utcDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatUtcDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : utcDateFormatter.format(d);
}

export function formatLocation(address: Address | null | undefined): string {
  if (!address) return '-';
  const parts = [address.city, address.state].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? parts.join(', ') : '-';
}
