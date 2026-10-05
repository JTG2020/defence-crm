import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/constants";
import { listAllOrderStages, listOrders, listRequirements } from "@/lib/data/db";
import { formatDate, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pill?: string }>;
}) {
  const { pill } = await searchParams;
  const [allOrders, requirements, stages] = await Promise.all([
    listOrders(),
    listRequirements(),
    listAllOrderStages(),
  ]);
  const refById = new Map(requirements.map((r) => [r.id, r.ref]));

  const atRisk = new Set(
    allOrders
      .filter((o) =>
        stages.some(
          (s) =>
            s.order_id === o.id &&
            !s.completed_at &&
            s.expected_date &&
            s.committed_date &&
            s.expected_date > s.committed_date,
        ),
      )
      .map((o) => o.id),
  );

  let orders = allOrders;
  const filters: string[] = [];
  if (pill === "open") {
    orders = orders.filter((o) => o.status !== "completed");
    filters.push("open");
  }
  if (pill === "risk") {
    orders = orders.filter((o) => atRisk.has(o.id));
    filters.push("at delivery risk");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Orders</h1>
      <DemoBanner />

      {filters.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Filtered by {filters.join(", ")} ·{" "}
          <Link href="/orders" className="text-primary hover:underline">
            clear
          </Link>
        </p>
      )}

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No orders match this filter. Seed with{" "}
          <code>supabase/demo/006_seed_orders.sql</code>.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO number</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead>PO date</TableHead>
              <TableHead className="text-right">PO value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.po_number ?? order.po_ref ?? order.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/requirements/${order.requirement_id}`}
                    className="text-primary hover:underline"
                  >
                    {refById.get(order.requirement_id) ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {order.po_date ? formatDate(order.po_date) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {order.po_value === null ? "—" : formatINR(order.po_value)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={ORDER_STATUS_VARIANT[order.status]}
                    label={ORDER_STATUS_LABEL[order.status]}
                  />
                </TableCell>
                <TableCell>
                  {atRisk.has(order.id) ? (
                    <StatusBadge variant="danger" label="At risk" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
