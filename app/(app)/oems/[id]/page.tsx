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
import {
  COMMITMENT_LABEL,
  COMMITMENT_VARIANT,
  DOCUMENT_TYPE_LABEL,
  OEM_APPROVAL_LABEL,
  OEM_APPROVAL_VARIANT,
} from "@/lib/constants";
import {
  addOemProductAction,
  setOemProductCapacityAction,
  updateOemAction,
} from "@/lib/data/actions";
import {
  getOem,
  listCommitmentsForOem,
  listDocumentsForOwner,
  listOemProductCapacity,
  listOemProducts,
  listOemRequestsForOem,
} from "@/lib/data/db";
import { formatDate, formatINR, formatQty } from "@/lib/format";
import type { DocumentType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const oem = await getOem(id);
  if (!oem) notFound();

  const [products, capacity, commitments, documents, requests] = await Promise.all([
    listOemProducts(id),
    listOemProductCapacity(id),
    listCommitmentsForOem(id),
    listDocumentsForOwner("oem", id),
    listOemRequestsForOem(id),
  ]);
  const pending = requests.filter((r) => r.responded_at === null);
  const capacityByProduct = new Map(capacity.map((c) => [c.oem_product_id, c]));

  return (
    <div className="space-y-4">
      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{oem.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge
              variant={OEM_APPROVAL_VARIANT[oem.approval_status]}
              label={OEM_APPROVAL_LABEL[oem.approval_status]}
            />
            <span className="text-sm text-muted-foreground">
              {(oem.capabilities ?? []).join(", ") || "no capabilities recorded"}
            </span>
          </div>
        </div>
        <Link href="/oems" className="text-sm text-primary hover:underline">
          all OEMs
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Products" value={String(products.length)} />
        <Metric label="Live commitments" value={String(commitments.length)} />
        <Metric
          label="Requests pending"
          value={String(pending.length)}
          tone={pending.length > 0 ? "danger" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateOemAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={oem.id} />
            <Field label="Name">
              <Input name="name" defaultValue={oem.name} required />
            </Field>
            <Field label="Approval">
              <Select name="approval_status" defaultValue={oem.approval_status}>
                <option value="approved">Approved</option>
                <option value="conditional">Conditional</option>
                <option value="not_approved">Not approved</option>
              </Select>
            </Field>
            <Field label="Lead time (days)">
              <Input
                name="lead_time_days"
                type="number"
                min={0}
                defaultValue={oem.lead_time_days}
              />
            </Field>
            <Field label="Capabilities (comma separated)">
              <Input name="capabilities" defaultValue={(oem.capabilities ?? []).join(", ")} />
            </Field>
            <Field label="Contact name">
              <Input name="contact_name" defaultValue={oem.contact_name ?? ""} />
            </Field>
            <Field label="Contact email">
              <Input name="contact_email" type="email" defaultValue={oem.contact_email ?? ""} />
            </Field>
            <Field label="Capacity applies (A1)">
              <Select
                name="capacity_shared"
                defaultValue={oem.capacity_shared === false ? "false" : "true"}
              >
                <option value="true">Shared across all orders (global pool)</option>
                <option value="false">Separately to each order</option>
              </Select>
            </Field>
            <div>
              <Button type="submit">Save details</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Declared</TableHead>
                  <TableHead className="text-right">Firm committed</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Lead</TableHead>
                  <TableHead>Set declared</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const cap = capacityByProduct.get(p.id);
                  const over = (cap?.over_committed ?? 0) > 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.part_number}</TableCell>
                      <TableCell className="text-muted-foreground">{p.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {cap?.declared_capacity ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {cap?.firm_committed ?? 0}
                      </TableCell>
                      <TableCell
                        className={
                          "text-right tabular-nums font-semibold " +
                          (over ? "text-danger-foreground" : "")
                        }
                      >
                        {cap?.available === null || cap?.available === undefined
                          ? "—"
                          : cap.available}
                        {over ? ` (over by ${cap?.over_committed})` : ""}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(p.unit_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.lead_time_days}</TableCell>
                      <TableCell>
                        <form
                          action={setOemProductCapacityAction}
                          className="flex items-center gap-1"
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="oem_id" value={oem.id} />
                          <Input
                            name="declared_capacity"
                            type="number"
                            min={0}
                            defaultValue={cap?.declared_capacity ?? ""}
                            className="h-8 w-24"
                            aria-label={`Declared capacity for ${p.part_number}`}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            Set
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <form
            action={addOemProductAction}
            className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
          >
            <input type="hidden" name="oem_id" value={oem.id} />
            <div className="space-y-1">
              <Label>Part no</Label>
              <Input name="part_number" required className="w-32" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input name="description" className="w-56" />
            </div>
            <div className="space-y-1">
              <Label>Unit price</Label>
              <Input name="unit_price" type="number" min={0} step="0.01" required className="w-28" />
            </div>
            <div className="space-y-1">
              <Label>Lead days</Label>
              <Input name="lead_time_days" type="number" min={0} required className="w-24" />
            </div>
            <div className="space-y-1">
              <Label>Declared capacity</Label>
              <Input name="declared_capacity" type="number" min={0} className="w-32" />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Add product
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live commitments on active requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {commitments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commitments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Expected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.requirement_id ? (
                        <Link
                          href={`/requirements/${c.requirement_id}`}
                          className="text-primary hover:underline"
                        >
                          {c.requirement_ref}
                        </Link>
                      ) : (
                        c.requirement_ref
                      )}
                    </TableCell>
                    <TableCell>{c.part_number}</TableCell>
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
                    <TableCell className="tabular-nums">
                      {formatDate(c.expected_date)}
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
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">This OEM has not been asked yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{formatDate(r.requested_at)}</TableCell>
                    <TableCell>
                      {r.responded_at ? (
                        <StatusBadge
                          variant="success"
                          label={`Replied ${formatDate(r.responded_at)}`}
                        />
                      ) : (
                        <StatusBadge variant="warning" label="Awaiting response" />
                      )}
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
          <CardTitle>Linked documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents linked.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {DOCUMENT_TYPE_LABEL[d.type as DocumentType] ?? d.type}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {d.expiry_date ? formatDate(d.expiry_date) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={
            "mt-1 tabular-nums text-xl font-semibold " +
            (tone === "danger" ? "text-danger-foreground" : "")
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
