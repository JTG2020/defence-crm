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
import Link from "next/link";

const BUILT = [
  ["Today", "KPI cards that link into filtered lists, stage donut, win/loss, why-lost, money outstanding by age, deadlines, follow-ups."],
  ["Requirements", "List, detail and edit; coverage from the database view; firm/indicative commitments; draft quote; send OEM request; record a loss."],
  ["OEMs", "List and detail; edit details; products; declared capacity and the shared-vs-per-order setting (A1)."],
  ["Quotes", "Draft from a requirement, set final prices, approve, then create an order."],
  ["Orders", "List and detail; record PDI and delivery; delivery-risk flag from the stage timeline."],
  ["Payments", "OEM invoices, record a partial payment, raise a commission (blocked before the OEM-payment milestone)."],
  ["Documents", "Vault with expiry state."],
  ["Follow-ups", "The reminder queue, generated on demand."],
  ["History and losses", "Search by part/ref/customer; record a structured loss reason."],
  ["Ask", "Deterministic plain-language questions with how-counted definitions."],
  ["Activity", "The audit trail, owner-only."],
];

const PENDING = [
  ["Reminder scheduling", "Run the follow-up generator automatically each day (pg_cron inside Supabase, or Vercel Cron).", "Deferred by the owner 2026-10-05; until then use Run reminders now on the Follow-ups screen."],
  ["Quotation PDF export", "Generate the quotation PDF from the stored quote.", "Not built; the client's most manual step."],
  ["Document upload and Excel export", "Upload certificates to storage; export lists to Excel.", "Not built."],
  ["Per-order capacity (A1)", "Compute availability separately for each order, not as one global pool.", "Only the assumed global mode is computed; waiting on Ram's confirmation of A1."],
  ["Quote versioning", "An edit after approval creates a new version, leaving the old one intact.", "The UI only edits drafts; the guard is pending."],
  ["Role-conditional UI", "Show only the actions your role can perform.", "Screens currently offer actions the database may refuse."],
  ["Needs-attention feed", "One ranked list of everything needing a decision today.", "Not built."],
  ["Other completeness", "Delete a requirement line; order/invoice/commission status changes; tabs; paste lines from Excel; top-bar search; OEM contacts and notes.", "Tracked in docs/PLAN.md."],
];

export default function RoadmapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">What is here, and what is pending</h1>
      <DemoBanner />

      <Card>
        <CardHeader>
          <CardTitle>Built and running on Postgres</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Screen</TableHead>
                <TableHead>What it does</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BUILT.map(([screen, what]) => (
                <TableRow key={screen}>
                  <TableCell className="font-medium">{screen}</TableCell>
                  <TableCell className="text-muted-foreground">{what}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            These are absent or partial on purpose, with reasons. Full list and order in{" "}
            <code>docs/PLAN.md</code>. An absent control is a known gap; a dead button is not.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>What it will do</TableHead>
                <TableHead>Why not yet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PENDING.map(([item, what, why]) => (
                <TableRow key={item}>
                  <TableCell className="font-medium">{item}</TableCell>
                  <TableCell className="text-muted-foreground">{what}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <StatusBadge variant="warning" label="Pending" />
                    <span className="ml-2">{why}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-sm text-muted-foreground">
            Deployment to Vercel is the owner&apos;s task; the app reads only{" "}
            <code>SUPABASE_URL</code> and <code>SUPABASE_PUBLISHABLE_KEY</code>. See the{" "}
            <Link href="/data" className="text-primary hover:underline">
              data check
            </Link>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
