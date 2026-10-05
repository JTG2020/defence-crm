import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  COVERAGE_LABEL,
  COVERAGE_VARIANT,
  COMMITMENT_LABEL,
  COMMITMENT_VARIANT,
} from "@/lib/constants";
import { canQuoteUncovered } from "@/lib/coverage";
import { recordCommitmentAction } from "@/lib/data/actions";
import { formatQty } from "@/lib/format";
import type { Commitment, CoverageRow } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function CoveragePanel({
  coverage,
  commitments,
  oemName,
  oems,
  requirementId,
  capacityWarning,
}: {
  coverage: CoverageRow;
  commitments: Commitment[];
  oemName: (id: string) => string;
  oems: { id: string; name: string }[];
  requirementId: string;
  capacityWarning?: string | null;
}) {
  const gate = canQuoteUncovered(coverage);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Coverage</CardTitle>
        <StatusBadge
          variant={COVERAGE_VARIANT[coverage.state]}
          label={COVERAGE_LABEL[coverage.state]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Metric label="Required" value={formatQty(coverage.required_qty)} />
          <Metric label="Firm committed" value={formatQty(coverage.firm_committed_qty)} />
          <Metric label="Indicative" value={formatQty(coverage.indicative_qty)} />
          <Metric
            label="Uncovered"
            value={formatQty(coverage.uncovered_qty)}
            tone={coverage.uncovered_qty > 0 ? "danger" : "default"}
          />
          <Metric label="Over-committed" value={formatQty(coverage.over_committed_qty)} />
        </dl>

        {coverage.firm_by_oem.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Firm cover split:{" "}
            {coverage.firm_by_oem
              .map((f) => `${oemName(f.oem_id)} ${formatQty(f.quantity)}`)
              .join(" · ")}
          </p>
        )}

        {commitments.length > 0 && (
          <ul className="space-y-1 text-sm">
            {commitments.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <StatusBadge
                  variant={COMMITMENT_VARIANT[c.kind]}
                  label={COMMITMENT_LABEL[c.kind]}
                />
                <span className="text-muted-foreground">
                  {oemName(c.oem_id)} · {formatQty(c.quantity)} · shipment {c.shipment_seq}
                </span>
              </li>
            ))}
          </ul>
        )}

        {capacityWarning && (
          <div className="flex items-start gap-2 rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">OEM capacity.</strong> {capacityWarning}
            </span>
          </div>
        )}

        {gate.allowed ? (
          <div className="flex items-center gap-2 rounded-md bg-success px-3 py-2 text-sm text-success-foreground">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Fully covered by firm commitments. A quote may be drafted.
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">Cannot quote.</strong> {gate.reason}
            </span>
          </div>
        )}

        <form
          action={recordCommitmentAction}
          className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
        >
          <input type="hidden" name="requirement_line_id" value={coverage.requirement_line_id} />
          <input type="hidden" name="requirement_id" value={requirementId} />
          <div className="space-y-1">
            <Label>OEM</Label>
            <Select name="oem_id" required className="w-32">
              {oems.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select name="kind" className="w-32">
              <option value="firm">Firm</option>
              <option value="indicative">Indication</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Qty</Label>
            <Input name="quantity" type="number" min={1} required className="w-24" />
          </div>
          <div className="space-y-1">
            <Label>Unit price</Label>
            <Input name="unit_price" type="number" min={0} step="0.01" required className="w-28" />
          </div>
          <div className="space-y-1">
            <Label>Expected</Label>
            <Input name="expected_date" type="date" required className="w-40" />
          </div>
          <Button type="submit" size="sm">
            Record commitment
          </Button>
        </form>
      </CardContent>
    </Card>
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
