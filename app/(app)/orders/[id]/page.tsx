import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/constants";
import { recordDeliveryAction, recordPdiAction } from "@/lib/data/actions";
import {
  getOrder,
  getRequirement,
  listDeliveries,
  listOrderLines,
  listOrderStages,
  listPdiRecords,
} from "@/lib/data/db";
import { formatDate, formatINR, formatQty } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const order = await getOrder(id);
  if (!order) notFound();

  const [requirement, lines, stages, pdis, deliveries] = await Promise.all([
    getRequirement(order.requirement_id),
    listOrderLines(id),
    listOrderStages(id),
    listPdiRecords(id),
    listDeliveries(id),
  ]);

  const totalOrdered = lines.reduce((sum, l) => sum + l.quantity_ordered, 0);
  const totalDelivered = deliveries.reduce((sum, d) => sum + d.quantity, 0);
  const outstanding = Math.max(0, totalOrdered - totalDelivered);
  const atRisk = stages.filter(
    (s) =>
      !s.completed_at && s.expected_date && s.committed_date && s.expected_date > s.committed_date,
  );

  return (
    <div className="space-y-4">
      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{order.po_number ?? order.po_ref ?? "Order"}</h1>
          <p className="text-sm text-muted-foreground">
            {requirement ? (
              <>
                <Link
                  href={`/requirements/${requirement.id}`}
                  className="text-primary hover:underline"
                >
                  {requirement.ref}
                </Link>{" "}
                · {requirement.customer}
              </>
            ) : (
              order.requirement_id
            )}{" "}
            ·{" "}
            <Link href="/orders" className="text-primary hover:underline">
              all orders
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            variant={ORDER_STATUS_VARIANT[order.status]}
            label={ORDER_STATUS_LABEL[order.status]}
          />
          <span className="text-xs text-muted-foreground">
            PO date {order.po_date ? formatDate(order.po_date) : "—"}
            {order.po_value !== null ? ` · ${formatINR(order.po_value)}` : ""}
          </span>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong className="font-semibold">Delivery risk.</strong> {atRisk.length} stage
            {atRisk.length === 1 ? "" : "s"} expecting later than committed:{" "}
            {atRisk.map((s) => s.stage).join(", ")}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Ordered" value={formatQty(totalOrdered)} />
        <Metric label="Delivered" value={formatQty(totalDelivered)} />
        <Metric
          label="Outstanding"
          value={formatQty(outstanding)}
          tone={outstanding > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Quantity ordered</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead>Delivery schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.part_number}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(line.quantity_ordered)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatINR(line.unit_price)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {line.delivery_schedule ? formatDate(line.delivery_schedule) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fulfilment timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Committed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => {
                const slipping =
                  !stage.completed_at &&
                  stage.expected_date &&
                  stage.committed_date &&
                  stage.expected_date > stage.committed_date;
                return (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.stage}</TableCell>
                    <TableCell className="text-muted-foreground">{stage.owner ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {stage.expected_date ? formatDate(stage.expected_date) : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {stage.committed_date ? formatDate(stage.committed_date) : "—"}
                    </TableCell>
                    <TableCell>
                      {stage.completed_at ? (
                        <StatusBadge
                          variant="success"
                          label={`Done ${formatDate(stage.completed_at)}`}
                        />
                      ) : slipping ? (
                        <StatusBadge variant="danger" label="Slipping" />
                      ) : (
                        <StatusBadge variant="info" label="In progress" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDI (inspection)</CardTitle>
        </CardHeader>
        <CardContent>
          {pdis.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inspection recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Offered</TableHead>
                  <TableHead className="text-right">Cleared</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Dispatch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdis.map((pdi) => (
                  <TableRow key={pdi.id}>
                    <TableCell className="font-medium">{pdi.part_number ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(pdi.offered_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(pdi.cleared_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(pdi.rejected_qty)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={
                          pdi.status === "passed"
                            ? "success"
                            : pdi.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                        label={pdi.status}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={pdi.dispatch_clearance === "approved" ? "success" : "danger"}
                        label={
                          pdi.dispatch_clearance === "approved" ? "Dispatch cleared" : "Dispatch hold"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <form
            action={recordPdiAction}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
          >
            <input type="hidden" name="order_id" value={order.id} />
            <div className="space-y-1">
              <Label>Part</Label>
              <Input name="part_number" required className="w-32" />
            </div>
            <div className="space-y-1">
              <Label>Offered</Label>
              <Input name="offered_qty" type="number" min={0} required className="w-24" />
            </div>
            <div className="space-y-1">
              <Label>Cleared</Label>
              <Input name="cleared_qty" type="number" min={0} defaultValue={0} className="w-24" />
            </div>
            <div className="space-y-1">
              <Label>Rejected</Label>
              <Input name="rejected_qty" type="number" min={0} defaultValue={0} className="w-24" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="inspection_date" type="date" required className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select name="inspection_type" className="w-28">
                <option value="physical">Physical</option>
                <option value="vc">VC</option>
                <option value="third_party">Third party</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Result</Label>
              <Select name="status" className="w-28">
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Dispatch</Label>
              <Select name="dispatch_clearance" className="w-32">
                <option value="hold">Hold</option>
                <option value="approved">Approved</option>
              </Select>
            </div>
            <Button type="submit">Record PDI</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing delivered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>GRN</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.delivery_ref ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(d.delivered_on)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(d.quantity)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.grn_number ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={d.status === "delivered" ? "success" : "info"}
                        label={d.status === "delivered" ? "Delivered" : "In transit"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <form
            action={recordDeliveryAction}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
          >
            <input type="hidden" name="order_id" value={order.id} />
            <div className="space-y-1">
              <Label>Reference</Label>
              <Input name="delivery_ref" required className="w-32" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="delivered_on" type="date" required className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input name="quantity" type="number" min={1} required className="w-28" />
            </div>
            <div className="space-y-1">
              <Label>GRN</Label>
              <Input name="grn_number" className="w-32" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select name="status" className="w-32">
                <option value="in_transit">In transit</option>
                <option value="delivered">Delivered</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Acceptance</Label>
              <Select name="acceptance" className="w-32">
                <option value="">—</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Closure</Label>
              <Select name="closure_status" className="w-32">
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
            <Button type="submit">Record delivery</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
}) {
  const colour =
    tone === "danger"
      ? "text-danger-foreground"
      : tone === "success"
        ? "text-success-foreground"
        : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={"mt-1 tabular-nums text-xl font-semibold " + colour}>{value}</div>
      </CardContent>
    </Card>
  );
}
