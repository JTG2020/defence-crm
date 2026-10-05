import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COMMITMENT_LABEL,
  COMMITMENT_VARIANT,
  OEM_APPROVAL_LABEL,
  OEM_APPROVAL_VARIANT,
} from "@/lib/constants";
import { listCommitments, listOemProducts, listOems } from "@/lib/data/db";
import { formatINR, formatQty } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OemsPage() {
  const [oems, products, commitments] = await Promise.all([
    listOems(),
    listOemProducts(),
    listCommitments(),
  ]);
  const nameOf = (oemId: string) => oems.find((o) => o.id === oemId)?.name ?? oemId;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">OEM master</h1>
      <DemoBanner />

      {oems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No OEMs in the database yet. Run{" "}
          <code>supabase/demo/004_seed_lines_and_sourcing.sql</code>.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OEM</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="text-right">Typical lead time</TableHead>
                    <TableHead>Capabilities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oems.map((oem) => (
                    <TableRow key={oem.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/oems/${oem.id}`}
                          className="text-primary hover:underline"
                        >
                          {oem.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={OEM_APPROVAL_VARIANT[oem.approval_status]}
                          label={OEM_APPROVAL_LABEL[oem.approval_status]}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {oem.lead_time_days}d
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(oem.capabilities ?? []).join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firm commitments and indications are separate facts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                An indication is never counted as cover. Only a firm commitment reduces the
                uncovered balance.
              </p>
              {commitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commitments recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OEM</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commitments.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{nameOf(c.oem_id)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={COMMITMENT_VARIANT[c.kind]}
                            label={COMMITMENT_LABEL[c.kind]}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(c.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(c.unit_price)}
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
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OEM</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Lead time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{nameOf(p.oem_id)}</TableCell>
                      <TableCell className="font-medium">{p.part_number}</TableCell>
                      <TableCell className="text-muted-foreground">{p.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(p.unit_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.lead_time_days}d
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
