import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
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
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_STATUS_VARIANT,
} from "@/lib/constants";
import { getCoverageForLines, listLinesForRequirements, listRequirements } from "@/lib/data/db";
import { formatDate } from "@/lib/format";
import type { CoverageState, RequirementStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANK: Record<CoverageState, number> = { covered: 0, partly_covered: 1, no_cover: 2 };

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cover?: string }>;
}) {
  const { status, cover } = await searchParams;
  const all = await listRequirements();
  const lines = await listLinesForRequirements(all.map((r) => r.id));
  const coverage = await getCoverageForLines(lines.map((l) => l.id));
  const coverageByLine = new Map(coverage.map((c) => [c.requirement_line_id, c]));

  const worstByRequirement = new Map<string, CoverageState>();
  const hasUncovered = new Set<string>();
  for (const line of lines) {
    const cov = coverageByLine.get(line.id);
    if (!cov) continue;
    const current = worstByRequirement.get(line.requirement_id);
    if (current === undefined || RANK[cov.state] > RANK[current]) {
      worstByRequirement.set(line.requirement_id, cov.state);
    }
    if (cov.uncovered_qty > 0) hasUncovered.add(line.requirement_id);
  }
  const lineCount = new Map<string, number>();
  for (const line of lines) {
    lineCount.set(line.requirement_id, (lineCount.get(line.requirement_id) ?? 0) + 1);
  }

  let requirements = all;
  const filters: string[] = [];
  if (status) {
    requirements = requirements.filter((r) => r.status === status);
    filters.push(
      `status: ${REQUIREMENT_STATUS_LABEL[status as RequirementStatus] ?? status}`,
    );
  }
  if (cover === "uncovered") {
    requirements = requirements.filter((r) => hasUncovered.has(r.id));
    filters.push("not fully covered");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Requirements</h1>
        <Link href="/requirements/new" className={buttonVariants()}>
          New requirement
        </Link>
      </div>

      <DemoBanner />

      {filters.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Filtered by {filters.join(", ")} ·{" "}
          <Link href="/requirements" className="text-primary hover:underline">
            clear
          </Link>
        </p>
      )}

      {requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requirements match this filter.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submission deadline</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead>Worst cover</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((r) => {
              const worst = worstByRequirement.get(r.id);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/requirements/${r.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.ref}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={REQUIREMENT_STATUS_VARIANT[r.status]}
                      label={REQUIREMENT_STATUS_LABEL[r.status]}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(r.submission_deadline)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {lineCount.get(r.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    {worst ? (
                      <StatusBadge variant={COVERAGE_VARIANT[worst]} label={COVERAGE_LABEL[worst]} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
