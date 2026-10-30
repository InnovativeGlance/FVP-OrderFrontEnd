import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Router state carried to the customer page so "Back to orders" can restore the orders list's filters */
export interface CustomerPageState {
  backTo?: string;
}

export function customerPath(email: string): string {
  // URLSearchParams encodes `@` and `+` (a raw `+` would be read back as a space)
  return `/customers?${new URLSearchParams({ email })}`;
}

interface CustomerLinkProps {
  email: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CustomerLink({ email, children, className, onClick }: CustomerLinkProps) {
  const location = useLocation();
  // From the orders list, remember its URL; from elsewhere (e.g. the customer page), keep what it was given.
  const state: CustomerPageState | null =
    location.pathname === '/' ? { backTo: `/${location.search}` } : (location.state as CustomerPageState | null);

  return (
    <Link
      to={customerPath(email)}
      state={state}
      // Table rows open the order details panel on click/Enter; the link must not trigger that too.
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className={cn(
        'rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none dark:hover:text-gold',
        className,
      )}
    >
      {children}
    </Link>
  );
}
