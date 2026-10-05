import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { completeTaskAction, runRemindersAction } from "@/lib/data/actions";
import { listTasks } from "@/lib/data/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  quote_followup: "Quote follow-up",
  oem_followup: "OEM follow-up",
  payment_due: "Payment due",
  document_expiry: "Document expiry",
};

const KIND_HREF: Record<string, string> = {
  quote_followup: "/quotes",
  oem_followup: "/requirements",
  payment_due: "/payments",
  document_expiry: "/documents",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const tasks = await listTasks();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Follow-ups</h1>
        <form action={runRemindersAction}>
          <Button type="submit">Run reminders now</Button>
        </form>
      </div>

      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">{error}</p>
      )}

      <p className="text-sm text-muted-foreground">
        Seven-day no-response follow-ups, payment-due and document-expiry reminders. Re-running the
        generator never creates a duplicate task.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Open tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open follow-ups. Run the generator, or complete the ones you have.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-muted-foreground">
                      {KIND_LABEL[task.kind] ?? task.kind}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={KIND_HREF[task.kind] ?? "/tasks"}
                        className="text-primary hover:underline"
                      >
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {task.due_date ? formatDate(task.due_date) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={completeTaskAction}>
                        <input type="hidden" name="task_id" value={task.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Complete
                        </Button>
                      </form>
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
