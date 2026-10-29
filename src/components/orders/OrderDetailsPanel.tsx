import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { ApiError, isAbortError } from '@/lib/api-client';
import { formatMoney, formatNumber, formatUtcDateTime } from '@/lib/format';
import { getOrder, getOrderNotes } from '@/services/orders.service';
import type { Address, OrderDetail, OrderItem, OrderItemType, OrderNote } from '@/types/api';

interface OrderDetailsPanelProps {
  orderId: number | null;
  onClose: () => void;
}

const ITEM_TYPE_LABELS: Record<Exclude<OrderItemType, 'line_item'>, string> = {
  shipping: 'Shipping',
  tax: 'Tax',
  fee: 'Fee',
  coupon: 'Coupon',
};

function formatAddress(address: Partial<Address> | null | undefined): string {
  if (!address) return '';
  if (address.full) return address.full;
  return [address.line1, address.line2, address.city, address.state, address.postcode, address.country]
    .filter(Boolean)
    .join(', ');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h3 className="border-b border-sand pb-2 text-xs font-semibold tracking-wide text-foreground/80 uppercase">
        {title}
      </h3>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function Field({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm break-words text-foreground">{value || '-'}</dd>
    </div>
  );
}

function ItemsTable({ order }: { order: OrderDetail }) {
  const currency = order.currency || 'USD';
  const money = (value: number | null | undefined) => (typeof value === 'number' ? formatMoney(value, currency) : '-');

  // The API already orders items: products, then fees, shipping, coupons, tax.
  const lineItems = order.items?.filter((item) => item.type === 'line_item') ?? [];
  const otherLines = order.items?.filter((item) => item.type !== 'line_item') ?? [];
  // Orders synced before items were stored have none; fall back to the summary fields on the order itself.
  const fallback: Array<Pick<OrderItem, 'itemId' | 'name' | 'productId' | 'unitPrice'> & { qty: number | null; amount: number | null }> =
    lineItems.length === 0 && order.productsSummary
      ? [{ itemId: 0, name: order.productsSummary, productId: null, unitPrice: null, qty: order.itemsTotalQty ?? null, amount: null }]
      : [];

  const rows = lineItems.length > 0 ? lineItems : fallback;
  const refund = order.refundTotal ?? 0;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[360px] border-collapse text-sm">
        <thead>
          <tr className="bg-sand-50 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <th className="px-2 py-2.5 text-left">Item</th>
            <th className="w-14 px-2 py-2.5 text-right">Qty</th>
            <th className="w-24 px-2 py-2.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.itemId} className="border-b border-sand">
              <td className="px-2 py-3 align-top">
                <div className="text-foreground">{item.name || 'Item'}</div>
                {(item.productId != null || item.unitPrice != null) && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      item.productId != null && `Product ID ${item.productId}`,
                      item.unitPrice != null && `${money(item.unitPrice)} each`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
              </td>
              <td className="px-2 py-3 text-right align-top tabular-nums">
                {item.qty != null ? formatNumber(item.qty) : '-'}
              </td>
              <td className="px-2 py-3 text-right align-top tabular-nums">{money(item.amount)}</td>
            </tr>
          ))}
          {otherLines.map((line) => (
            <tr key={line.itemId} className="border-b border-sand">
              <td className="px-2 py-3 text-foreground">
                {line.name || ITEM_TYPE_LABELS[line.type as keyof typeof ITEM_TYPE_LABELS]}
                <span className="text-xs text-muted-foreground"> ({ITEM_TYPE_LABELS[line.type as keyof typeof ITEM_TYPE_LABELS]})</span>
              </td>
              <td className="px-2 py-3 text-right">-</td>
              <td className="px-2 py-3 text-right tabular-nums">
                {line.type === 'coupon' && line.amount > 0 ? `-${money(line.amount)}` : money(line.amount)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && otherLines.length === 0 && (
            <tr className="border-b border-sand">
              <td colSpan={3} className="px-2 py-5 text-center text-muted-foreground">
                No items recorded
              </td>
            </tr>
          )}
          {refund > 0 && (
            <tr className="border-b border-sand">
              <td className="px-2 py-3 text-foreground">
                Refunded
                {order.refundReason && <div className="mt-0.5 text-xs text-muted-foreground">{order.refundReason}</div>}
              </td>
              <td className="px-2 py-3 text-right">-</td>
              <td className="px-2 py-3 text-right text-red-700 dark:text-red-400 tabular-nums">-{money(refund)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-foreground/25">
            <th colSpan={2} className="px-2 py-3 text-left font-semibold text-foreground">
              Order total
            </th>
            <td className="px-2 py-3 text-right font-semibold text-foreground tabular-nums">{money(order.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface NotesState {
  notes: OrderNote[] | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Notes come from their own endpoint; fetched alongside the order so neither waits on the other */
function useOrderNotes(orderId: number | null): NotesState {
  const [notes, setNotes] = useState<OrderNote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (orderId === null) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setNotes(null);

    getOrderNotes(orderId, controller.signal)
      .then((res) => {
        setNotes(res.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setLoading(false);
        if (err instanceof ApiError && err.status === 401) return; // handled globally
        setError(err instanceof Error ? err.message : 'Failed to load order notes');
      });

    return () => controller.abort();
  }, [orderId, attempt]);

  return { notes, loading, error, retry: () => setAttempt((n) => n + 1) };
}

function OrderNotes({ notes, loading, error, retry }: NotesState) {
  return (
    <Section title={notes ? `Order notes (${notes.length})` : 'Order notes'}>
      {loading && (
        <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading notes…
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn't load notes</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {notes?.length === 0 && <p className="text-sm text-muted-foreground">No order notes.</p>}
      {notes && notes.length > 0 && (
        <ol className="-mt-1 divide-y divide-sand">
          {notes.map((note) => (
            <li key={note.noteId} className="py-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{note.author || 'System'}</span>
                {note.createdAt && <> - {formatUtcDateTime(note.createdAt)}</>}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground">{note.content || '-'}</p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function OrderContent({ order, notes }: { order: OrderDetail; notes: NotesState }) {
  const customer = order.customer ?? {};
  const shipping = order.shipping ?? {};
  const tracking = [order.trackingProvider, order.trackingNumber].filter(Boolean).join(' ');

  return (
    <>
      <Section title="Billing">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Name" value={customer.name} />
          <Field label="Company" value={customer.company} />
          <Field label="Email" value={customer.email} />
          <Field label="Phone" value={customer.phone} />
          <Field label="Address" value={formatAddress(customer.address)} wide />
        </dl>
      </Section>

      <Section title="Shipping">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Name" value={shipping.name} />
          <Field label="Company" value={shipping.company} />
          <Field label="Address" value={formatAddress(shipping.address)} wide />
          {tracking && <Field label="Tracking" value={tracking} wide />}
        </dl>
      </Section>

      <Section title="Payment">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Payment method" value={order.paymentMethod} />
          <Field label="Transaction ID" value={order.transactionId} />
          {order.customerNote && <Field label="Customer note" value={order.customerNote} wide />}
        </dl>
      </Section>

      <Section title="Items">
        <ItemsTable order={order} />
      </Section>

      <OrderNotes {...notes} />
    </>
  );
}

export function OrderDetailsPanel({ orderId, onClose }: OrderDetailsPanelProps) {
  // Keep the last id (and its order) while the panel animates closed so the content doesn't blank out.
  const [shownId, setShownId] = useState(orderId);
  if (orderId !== null && orderId !== shownId) setShownId(orderId);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const notes = useOrderNotes(orderId);

  useEffect(() => {
    if (orderId === null) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOrder(null);

    getOrder(orderId, controller.signal)
      .then((res) => {
        setOrder(res.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setLoading(false);
        if (err instanceof ApiError && err.status === 401) return; // handled globally
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      });

    return () => controller.abort();
  }, [orderId, attempt]);

  return (
    <DialogPrimitive.Root open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col bg-card text-card-foreground shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:slide-in-from-right">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b-4 border-gold bg-primary px-5 py-5 text-primary-foreground sm:px-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold">Order #{shownId}</DialogPrimitive.Title>
              <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-2 text-sm text-white/85">
                {order && <span>{formatUtcDateTime(order.orderDate)}</span>}
                {order && <StatusBadge status={order.status} />}
              </div>
              <DialogPrimitive.Description className="sr-only">
                Billing, shipping, payment, items and notes for order {shownId}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close order details"
                className="rounded-md border border-white/50 text-white hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
              >
                <X aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            {loading && (
              <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading order details…
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Couldn't load order</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>{error}</span>
                  <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {order && <OrderContent order={order} notes={notes} />}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
