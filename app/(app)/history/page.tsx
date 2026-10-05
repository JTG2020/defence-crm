import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LOSS_REASON_LABEL,
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_STATUS_VARIANT,
} from "@/lib/constants";
import { searchHistory } from "@/lib/data/db";
import { formatDate } from "@/lib/format";
import type { LossReason } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchHistory(query) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">History</h1>
      <DemoBanner />

      <form method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Part number, reference or customer"
          className="max-w-md flex-1"
          aria-label="Search history"
        />
        <Button type="submit">Search</Button>
      </form>

      {query === "" ? (
        <p className="text-sm text-muted-foreground">
          Search past requirements by part number, reference or customer. Each result shows the
          outcome and, when it was lost, the structured reason.
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comparable found for “{query}”. Nothing is invented; try another part number or
          reference.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Matched parts</TableHead>
              <TableHead>Deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(({ requirement, matched_line_parts }) => (
              <TableRow key={requirement.id}>
                <TableCell>
                  <Link
                    href={`/requirements/${requirement.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {requirement.ref}
                  </Link>
                </TableCell>
                <TableCell>{requirement.customer}</TableCell>
                <TableCell>
                  <StatusBadge
                    variant={REQUIREMENT_STATUS_VARIANT[requirement.status]}
                    label={REQUIREMENT_STATUS_LABEL[requirement.status]}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {requirement.status === "lost" && requirement.loss_reason
                    ? LOSS_REASON_LABEL[requirement.loss_reason as LossReason]
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {matched_line_parts.length > 0 ? matched_line_parts.join(", ") : "—"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(requirement.submission_deadline)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
