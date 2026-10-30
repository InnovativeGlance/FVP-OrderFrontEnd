import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { exportOrders } from '@/services/orders.service';
import type { OrdersExportQuery } from '@/types/api';

interface ExportButtonProps {
  /** Exactly the filters and sort the table is showing, so the file matches the screen */
  query: OrdersExportQuery;
  disabled?: boolean;
  className?: string;
}

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportButton({ query, disabled, className }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      // The endpoint needs the Authorization header, so it's fetched as a blob rather than linked to.
      const { blob, fileName } = await exportOrders(query);
      saveFile(blob, fileName ?? 'orders.csv');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) return; // handled globally
      toast.error(err instanceof Error ? err.message : 'Export failed', { id: 'export-error' });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={disabled || exporting} className={className}>
      {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
      {exporting ? 'Exporting…' : 'Export CSV'}
    </Button>
  );
}
