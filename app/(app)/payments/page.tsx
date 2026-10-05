import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { raiseCommissionAction, recordPaymentAction } from "@/lib/data/actions";
import { listCommissionInvoices, listOemInvoicesWithBalance } from "@/lib/data/db";
import { formatDate, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pill?: string }>;
}) {
  const { error, pill } = await searchParams;
  const [allInvoices, commissions] = await Promise.all([
    listOemInvoicesWithBalance(),
    listCommissionInvoices(),
  ]);
  const payable = allInvoices.filter((i) => i.paid > 0);
  const invoices = pill === "pending" ? allInvoices.filter((i) => i.outstanding > 0) : allInvoices;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Payments</h1>
      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">{error}</p>
      )}

      {pill === "pending" && (
        <p className="text-sm text-muted-foreground">
          Filtered to invoices with an outstanding balance ·{" "}
          <Link href="/payments" className="text-primary hover:underline">
            clear
          </Link>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>OEM invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet. Run <code>supabase/demo/008_seed_payments.sql</code>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                    <TableCell>
                      <Link
                        href={`/orders/${invoice.order_id}`}
                        className="text-primary hover:underline"
                      >
                        view order
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {invoice.invoice_date ? formatDate(invoice.invoice_date) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(invoice.gross_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(invoice.paid)}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right tabular-nums font-semibold " +
                        (invoice.outstanding > 0 ? "text-danger-foreground" : "text-success-foreground")
                      }
                    >
                      {formatINR(invoice.outstanding)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={invoice.outstanding > 0 ? "warning" : "success"}
                        label={invoice.outstanding > 0 ? "Part paid" : "Paid"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record a payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={recordPaymentAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Invoice</Label>
              <Select name="oem_invoice_id" required className="w-48">
                {allInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_no}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input name="amount" type="number" min={1} step="0.01" required className="w-36" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="paid_on" type="date" required className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Mode</Label>
              <Select name="mode" className="w-28">
                <option value="rtgs">RTGS</option>
                <option value="neft">NEFT</option>
                <option value="wire">Wire</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reference</Label>
              <Input name="payment_ref" required placeholder="UTR / ref" className="w-40" />
            </div>
            <Button type="submit">Record payment</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            A commission invoice can only be raised after an OEM-payment milestone — the database
            refuses it otherwise.
          </p>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commission</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.commission_no}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.commission_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(c.base_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(c.commission_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(c.gst_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatINR(c.gross_value)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={c.payment_status === "paid" ? "success" : "warning"}
                        label={c.payment_status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raise a commission invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {payable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No OEM invoice has a payment yet, so no commission can be raised.
            </p>
          ) : (
            <form action={raiseCommissionAction} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>OEM invoice</Label>
                <Select name="oem_invoice_id" required className="w-48">
                  {payable.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_no}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Commission no.</Label>
                <Input name="commission_no" required placeholder="COMM-002" className="w-36" />
              </div>
              <div className="space-y-1">
                <Label>Percentage</Label>
                <Input name="commission_pct" type="number" min={0} step="0.01" required className="w-28" />
              </div>
              <div className="space-y-1">
                <Label>Invoice date</Label>
                <Input name="invoice_date" type="date" required className="w-40" />
              </div>
              <Button type="submit">Raise commission</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
