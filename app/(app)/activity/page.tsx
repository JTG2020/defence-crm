import { DemoBanner } from "@/components/demo-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAuditLog } from "@/lib/data/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const entries = await listAuditLog(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Activity</h1>
      <DemoBanner />

      <p className="text-sm text-muted-foreground">
        Every material change is recorded by a database trigger: what changed, and who did it. Only
        the owner role can read this log.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Recent changes ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audited changes visible to you. (If you are not the owner, this log is hidden by
              policy.)
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="tabular-nums">
                      {formatDate(entry.at)}
                    </TableCell>
                    <TableCell className="font-medium uppercase">{entry.action}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.entity_id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.actor ?? "seed"}
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
