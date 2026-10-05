import { Info } from "lucide-react";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_VARIANT } from "@/lib/constants";
import { approveQuoteAction, setQuoteLinePriceAction } from "@/lib/data/actions";
import { formatINR } from "@/lib/format";
import type { Quote, QuoteVersion, QuoteVersionLine, RequirementLine } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function QuoteDraft({
  quote,
  versions,
  lines,
  requirementLines,
}: {
  quote: Quote;
  versions: QuoteVersion[];
  lines: QuoteVersionLine[];
  requirementLines: RequirementLine[];
}) {
  const version = versions[0];
  const partOf = (lineId: string) =>
    requirementLines.find((l) => l.id === lineId)?.part_number ?? lineId;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          Quote {quote.id} · v{quote.current_version}
        </CardTitle>
        <StatusBadge
          variant={QUOTE_STATUS_VARIANT[quote.status]}
          label={QUOTE_STATUS_LABEL[quote.status]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead className="text-right">OEM price</TableHead>
              <TableHead className="text-right">Lead time</TableHead>
              <TableHead className="text-right">Target margin</TableHead>
              <TableHead className="text-right">Recommended (advisory)</TableHead>
              <TableHead className="text-right">Final (human)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{partOf(l.requirement_line_id)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(l.oem_price)}</TableCell>
                <TableCell className="text-right tabular-nums">{l.lead_time_days}d</TableCell>
                <TableCell className="text-right tabular-nums">{l.target_margin_pct}%</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatINR(l.recommended_price)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {quote.status === "draft" ? (
                    <form
                      action={setQuoteLinePriceAction}
                      className="flex items-center justify-end gap-1"
                    >
                      <input type="hidden" name="line_id" value={l.id} />
                      <Input
                        name="final_price"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={l.final_price ?? ""}
                        className="h-8 w-24 text-right"
                        aria-label={`Final price for ${partOf(l.requirement_line_id)}`}
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Set
                      </Button>
                    </form>
                  ) : l.final_price === null ? (
                    "— not set"
                  ) : (
                    formatINR(l.final_price)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            The recommended figure is advisory only. The final price is typed by a person — no
            control in this app can set or submit it. Approval and PDF export are not in this
            build; until they are, keep preparing the quotation in Word or Excel.
          </span>
        </div>
        {version && (
          <p className="text-xs text-muted-foreground">
            Showing version {version.version_no}
            {version.approved_at ? ` · approved ${version.approved_at}` : " · not approved"}.
          </p>
        )}

        {quote.status === "draft" && (
          <form action={approveQuoteAction}>
            <input type="hidden" name="quote_id" value={quote.id} />
            <Button type="submit" size="sm">
              Approve quote
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
