import { AlertTriangle, Database, Inbox, XCircle } from "lucide-react";
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
import { createServerSupabase } from "@/lib/supabase/server";
import {
  probeRequirements,
  resolveSettings,
  type ProbeResult,
  type Queryable,
  type RequirementRow,
} from "@/lib/supabase/probe";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
  received: "info",
  qualifying: "warning",
  quoted: "info",
  submitted: "info",
  won: "success",
  lost: "danger",
  cancelled: "neutral",
};

// Reads public.requirements as the SIGNED-IN user, so RLS applies to this session.
export default async function DataCheckPage() {
  const settings = resolveSettings(process.env);
  const result: ProbeResult = settings.ok
    ? await probeRequirements(process.env, async () => {
        const supabase = await createServerSupabase();
        return {
          select: () =>
            supabase.from("requirements").select("*").order("created_at", { ascending: false }),
        } as Queryable;
      })
    : { kind: "missing_setting", setting: settings.setting };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Data check — requirements</h1>
        <p className="text-sm text-muted-foreground">
          Reads <code>public.requirements</code> from Supabase as your signed-in session and says
          why a screen might be bare. A missing setting, a failed call and an empty table are three
          different things and are shown three different ways below.
        </p>
      </div>

      {result.kind === "missing_setting" && (
        <Card className="border-warning bg-warning text-warning-foreground">
          <CardHeader className="flex-row items-center gap-2">
            <AlertTriangle aria-hidden="true" className="size-5" />
            <CardTitle>Configuration missing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Setting not found: <code className="font-semibold">{result.setting}</code>
            </p>
            <p>
              Add <code>{result.setting}</code> to <code>.env</code>, then restart the server. No
              call to Supabase was attempted.
            </p>
          </CardContent>
        </Card>
      )}

      {result.kind === "error" && (
        <Card className="border-danger bg-danger text-danger-foreground">
          <CardHeader className="flex-row items-center gap-2">
            <XCircle aria-hidden="true" className="size-5" />
            <CardTitle>Supabase call failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="break-words font-mono text-xs">{result.message}</p>
            <p>The settings are present and Supabase was reached, but the query did not succeed.</p>
          </CardContent>
        </Card>
      )}

      {result.kind === "empty" && (
        <Card className="border-border bg-muted">
          <CardHeader className="flex-row items-center gap-2">
            <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
            <CardTitle>Connected — table is empty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              The call succeeded and returned <strong>0 rows visible to you</strong>. If you
              expected data, check the rows were seeded and that your role&apos;s RLS policies
              allow them.
            </p>
          </CardContent>
        </Card>
      )}

      {result.kind === "rows" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database aria-hidden="true" className="size-4 text-success-foreground" />
            Connected — {result.rows.length} row{result.rows.length === 1 ? "" : "s"}
          </div>
          <RequirementsTable rows={result.rows} />
        </div>
      )}
    </div>
  );
}

function RequirementsTable({ rows }: { rows: RequirementRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ref</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submission deadline</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.ref}</TableCell>
            <TableCell>{r.customer}</TableCell>
            <TableCell>
              <StatusBadge variant={STATUS_VARIANT[r.status] ?? "neutral"} label={r.status} />
            </TableCell>
            <TableCell className="tabular-nums">{r.submission_deadline ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{r.notes ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
