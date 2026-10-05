import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { CoveragePanel } from "@/components/coverage-panel";
import { QuoteDraft } from "@/components/quote-draft";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  COVERAGE_LABEL,
  COVERAGE_VARIANT,
  LOSS_REASON_LABEL,
  LOSS_REASONS,
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_STATUS_VARIANT,
} from "@/lib/constants";
import { createQuoteAction, recordLossAction, sendOemRequestAction } from "@/lib/data/actions";
import {
  getCoverageForLines,
  getQuoteForRequirement,
  getQuoteLines,
  getQuoteVersions,
  getRequirement,
  listCommitmentsForLines,
  listLinesForRequirement,
  listOemProductCapacity,
  listOemRequestsForLines,
  listOems,
} from "@/lib/data/db";
import { formatDate, formatQty } from "@/lib/format";
import type { Commitment, LossReason } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RequirementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const requirement = await getRequirement(id);
  if (!requirement) notFound();

  const lines = await listLinesForRequirement(id);
  const lineIds = lines.map((l) => l.id);
  const [coverage, commitments, requests, oems, capacity] = await Promise.all([
    getCoverageForLines(lineIds),
    listCommitmentsForLines(lineIds),
    listOemRequestsForLines(lineIds),
    listOems(),
    listOemProductCapacity(),
  ]);

  const coverageByLine = new Map(coverage.map((c) => [c.requirement_line_id, c]));

  const totalRequired = coverage.reduce((sum, c) => sum + c.required_qty, 0);
  const totalFirm = coverage.reduce((sum, c) => sum + c.firm_committed_qty, 0);
  const totalIndicative = coverage.reduce((sum, c) => sum + c.indicative_qty, 0);
  const totalUncovered = coverage.reduce((sum, c) => sum + c.uncovered_qty, 0);
  const coveredLines = coverage.filter((c) => c.state === "covered").length;
  const coveredPct =
    totalRequired > 0 ? Math.round((Math.min(totalFirm, totalRequired) / totalRequired) * 100) : 0;
  const commitmentsByLine = new Map<string, Commitment[]>();
  for (const commitment of commitments) {
    const list = commitmentsByLine.get(commitment.requirement_line_id) ?? [];
    list.push(commitment);
    commitmentsByLine.set(commitment.requirement_line_id, list);
  }
  const oemName = (oemId: string) => oems.find((o) => o.id === oemId)?.name ?? oemId;
  const capacityByOemPart = new Map(capacity.map((c) => [`${c.oem_id}:${c.part_number}`, c]));

  // A1: flag a line whose firm commitment pushes its OEM over declared capacity (global pool).
  const capacityWarningFor = (partNumber: string, lineCommitments: Commitment[]): string | null => {
    for (const c of lineCommitments) {
      if (c.kind !== "firm") continue;
      const cap = capacityByOemPart.get(`${c.oem_id}:${partNumber}`);
      if (cap && cap.over_committed > 0 && cap.declared_capacity !== null) {
        return `${oemName(c.oem_id)} is over its declared capacity for ${partNumber} by ${cap.over_committed} (declared ${cap.declared_capacity}, firm ${cap.firm_committed}).`;
      }
    }
    return null;
  };

  const quote = await getQuoteForRequirement(id);
  const versions = quote ? await getQuoteVersions(quote.id) : [];
  const quoteLines = versions[0] ? await getQuoteLines(versions[0].id) : [];

  return (
    <div className="space-y-4">
      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{requirement.ref}</h1>
          <p className="text-sm text-muted-foreground">{requirement.customer}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/requirements/${requirement.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Edit
          </Link>
          <StatusBadge
            variant={REQUIREMENT_STATUS_VARIANT[requirement.status]}
            label={REQUIREMENT_STATUS_LABEL[requirement.status]}
          />
          {requirement.status === "lost" && requirement.loss_reason && (
            <StatusBadge
              variant="danger"
              label={`Loss: ${LOSS_REASON_LABEL[requirement.loss_reason as LossReason]}`}
            />
          )}
          <span className="text-xs text-muted-foreground">
            Submission {formatDate(requirement.submission_deadline)}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Coverage</CardTitle>
          <span className="text-sm text-muted-foreground">
            {coveredPct}% · {coveredLines} of {lines.length} line
            {lines.length === 1 ? "" : "s"} fully covered
          </span>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Required" value={formatQty(totalRequired)} />
            <Metric label="Firm committed" value={formatQty(totalFirm)} />
            <Metric
              label="Uncovered"
              value={formatQty(totalUncovered)}
              tone={totalUncovered > 0 ? "danger" : "default"}
            />
            <Metric label="Indicated, not counted" value={formatQty(totalIndicative)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items ({lines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No line items on this requirement.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const cov = coverageByLine.get(line.id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {line.line_no}
                      </TableCell>
                      <TableCell className="font-medium">{line.part_number}</TableCell>
                      <TableCell className="text-muted-foreground">{line.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(line.quantity)}
                      </TableCell>
                      <TableCell>{line.uom}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(line.deadline)}</TableCell>
                      <TableCell>
                        {cov ? (
                          <StatusBadge
                            variant={COVERAGE_VARIANT[cov.state]}
                            label={COVERAGE_LABEL[cov.state]}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold">Coverage and commitments</h2>
      <div className="space-y-3">
        {lines.map((line) => {
          const cov = coverageByLine.get(line.id);
          if (!cov) return null;
          return (
            <div key={line.id} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {line.part_number} · {line.description}
              </div>
              <CoveragePanel
                coverage={cov}
                commitments={commitmentsByLine.get(line.id) ?? []}
                oemName={oemName}
                oems={oems}
                requirementId={id}
                capacityWarning={capacityWarningFor(
                  line.part_number,
                  commitmentsByLine.get(line.id) ?? [],
                )}
              />
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OEM requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No OEM has been asked yet.</p>
          ) : (
            <div className="mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OEM</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{oemName(r.oem_id)}</TableCell>
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
            </div>
          )}

          <form
            action={sendOemRequestAction}
            className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
          >
            <input type="hidden" name="requirement_id" value={requirement.id} />
            <div className="space-y-1">
              <Label>Line</Label>
              <Select name="requirement_line_id" required className="w-48">
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.part_number}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>OEM</Label>
              <Select name="oem_id" required className="w-40">
                {oems.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline" size="sm">
              Send OEM request
            </Button>
          </form>
        </CardContent>
      </Card>

      {!["won", "lost", "cancelled"].includes(requirement.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Record this requirement as lost</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordLossAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="requirement_id" value={requirement.id} />
              <div className="space-y-1">
                <Label>Loss reason</Label>
                <Select name="loss_reason" required className="w-64">
                  {LOSS_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {LOSS_REASON_LABEL[reason]}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="destructive">
                Mark lost
              </Button>
            </form>
            <p className="mt-2 text-sm text-muted-foreground">
              A loss cannot be saved without a reason from the list; the database enforces it.
            </p>
          </CardContent>
        </Card>
      )}

      {quote ? (
        <QuoteDraft quote={quote} versions={versions} lines={quoteLines} requirementLines={lines} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No quote on this requirement yet</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createQuoteAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="requirement_id" value={requirement.id} />
              <div className="space-y-1">
                <Label>Target margin %</Label>
                <Input
                  name="margin"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={15}
                  className="w-28"
                />
              </div>
              <Button type="submit">Draft quote</Button>
            </form>
            <p className="mt-2 text-sm text-muted-foreground">
              Prices come from the cheapest firm commitment on the line, else the cheapest OEM
              product. The recommended price is generated; the final price stays a human field.
            </p>
          </CardContent>
        </Card>
      )}
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
    <div className="rounded-md bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          "tabular-nums text-base font-semibold " +
          (tone === "danger" ? "text-danger-foreground" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
