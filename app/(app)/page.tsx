import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { LossReasonChart, OrdersByStageDonut, WinLossChart } from "@/components/charts";
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
  COVERAGE_LABEL,
  COVERAGE_VARIANT,
  LEAD_SOURCE_LABEL,
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  LEAD_STAGE_VARIANT,
  LOSS_REASON_LABEL,
} from "@/lib/constants";
import { createLeadAction, setLeadStageAction } from "@/lib/data/actions";
import {
  dashboard,
  documentsWithStatus,
  invoiceAgeing,
  listLeadFollowUpsDue,
  listLeads,
  listTasks,
  listUncoveredLines,
  listUpcomingDeadlines,
} from "@/lib/data/db";
import { formatDate, formatINR, formatQty } from "@/lib/format";
import type { LossReason } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [data, uncovered, docs, tasks, deadlines, ageing, leadFollowUps, leads] = await Promise.all([
    dashboard(),
    listUncoveredLines(),
    documentsWithStatus(),
    listTasks(),
    listUpcomingDeadlines(14),
    invoiceAgeing(),
    listLeadFollowUpsDue(),
    listLeads(),
  ]);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const isOpenLead = (stage: string) => stage !== "won" && stage !== "lost";

  const unitsUncovered = uncovered.reduce((sum, u) => sum + u.coverage.uncovered_qty, 0);
  const expiring = docs.filter(
    (d) => d.expiry_state === "expiring" || d.expiry_state === "expired",
  );
  const lossData = data.lossReasons.map((r) => ({
    reason: LOSS_REASON_LABEL[r.reason as LossReason],
    count: r.count,
  }));
  const pipelineMax = Math.max(1, ...Object.values(data.pipeline));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          Ram Prasad&apos;s calls, WhatsApp and referral leads — and the tenders behind them.
        </p>
      </div>

      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLeadAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="redirect_to" value="/" />
            <div className="space-y-1">
              <Label>Source</Label>
              <Select name="source" required className="w-36">
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referral">Referral</option>
                <option value="gem">GeM</option>
                <option value="portal">Portal</option>
                <option value="direct">Direct</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="name" required placeholder="Contact name" className="w-44" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="phone" placeholder="+91 …" className="w-36" />
            </div>
            <div className="space-y-1">
              <Label>Enquiry</Label>
              <Input name="product_note" placeholder="What do they want?" className="w-56" />
            </div>
            <div className="space-y-1">
              <Label>Next follow-up</Label>
              <Input name="next_follow_up" type="date" className="w-40" />
            </div>
            <Button type="submit">Add lead</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet. Add the first one above, from a call, WhatsApp or referral.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Enquiry</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.slice(0, 15).map((lead) => {
                  const due =
                    lead.next_follow_up !== null &&
                    lead.next_follow_up <= today &&
                    isOpenLead(lead.stage);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="text-muted-foreground">
                        {LEAD_SOURCE_LABEL[lead.source]}
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.name}
                        {lead.company ? (
                          <span className="block text-xs text-muted-foreground">{lead.company}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {lead.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.product_note ?? "—"}
                      </TableCell>
                      <TableCell>
                        {lead.next_follow_up ? (
                          <span className={due ? "font-semibold text-danger-foreground" : ""}>
                            {formatDate(lead.next_follow_up)}
                            {due ? " · due" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <form action={setLeadStageAction} className="flex items-center gap-1">
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <input type="hidden" name="redirect_to" value="/" />
                          <StatusBadge
                            variant={LEAD_STAGE_VARIANT[lead.stage]}
                            label={LEAD_STAGE_LABEL[lead.stage]}
                          />
                          <Select name="stage" defaultValue={lead.stage} className="h-8 w-28">
                            {LEAD_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {LEAD_STAGE_LABEL[s]}
                              </option>
                            ))}
                          </Select>
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
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold text-muted-foreground">Contract pipeline</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Not fully covered"
          value={data.uncoveredLines}
          sub={`${formatQty(unitsUncovered)} units without firm cover`}
          tone={data.uncoveredLines > 0 ? "danger" : "default"}
          href="/requirements?cover=uncovered"
        />
        <Stat
          label="Open orders"
          value={data.openOrders}
          sub={`${data.openOrdersByStage.map((s) => `${s.count} ${s.stage}`).join(", ") || "none"}`}
          href="/orders?pill=open"
        />
        <Stat
          label="Quotes awaiting response"
          value={data.quotesAwaitingResponse}
          sub="Draft or pending approval"
          href="/quotes"
        />
        <Stat
          label="Orders at delivery risk"
          value={data.ordersAtRisk}
          sub={data.ordersAtRisk > 0 ? "A stage is slipping" : "None late yet"}
          tone={data.ordersAtRisk > 0 ? "danger" : "default"}
          href="/orders?pill=risk"
        />
        <Stat
          label="Payments pending"
          value={formatINR(data.paymentsPendingAmount)}
          sub={`${data.paymentsPending} invoice${data.paymentsPending === 1 ? "" : "s"} outstanding`}
          tone={data.paymentsPending > 0 ? "danger" : "default"}
          href="/payments?pill=pending"
        />
        <Stat
          label="OEM responses pending"
          value={data.oemResponsesPending}
          sub="Requests sent, no reply yet"
          href="/tasks"
        />
        <Stat
          label="Documents expiring"
          value={data.documentsExpiring}
          sub="Within 60 days or expired"
          href="/documents?filter=attention"
        />
        <Stat
          label="Win rate"
          value={`${data.winRate}%`}
          sub={`${data.winCount} won · ${data.lossCount} lost`}
          href="/history"
        />
        <Stat
          label="Lead follow-ups due"
          value={data.leadFollowUpsDue}
          sub="Calls, WhatsApp, referrals"
          tone={data.leadFollowUpsDue > 0 ? "danger" : "default"}
          href="/leads"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead follow-ups due today ({leadFollowUps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leadFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lead needs a follow-up today.{" "}
              <Link href="/leads" className="text-primary hover:underline">
                Open Leads
              </Link>
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {leadFollowUps.slice(0, 8).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-2">
                  <Link href="/leads" className="hover:text-primary hover:underline">
                    {lead.name}
                    {lead.company ? ` · ${lead.company}` : ""}
                  </Link>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {lead.phone ?? ""}
                    {lead.next_follow_up ? ` · ${formatDate(lead.next_follow_up)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open orders by stage</CardTitle>
          </CardHeader>
          <CardContent>
            {data.openOrdersByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open orders.</p>
            ) : (
              <OrdersByStageDonut data={data.openOrdersByStage} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Won vs lost by month</CardTitle>
          </CardHeader>
          <CardContent>
            <WinLossChart data={data.winLoss} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why we lost</CardTitle>
          </CardHeader>
          <CardContent>
            {lossData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing lost yet.</p>
            ) : (
              <LossReasonChart data={lossData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Received", value: data.pipeline.received },
              { label: "Quoted", value: data.pipeline.quoted },
              { label: "Submitted", value: data.pipeline.submitted },
              { label: "Won", value: data.pipeline.won },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="tabular-nums font-medium">{row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round((row.value / pipelineMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submission deadlines, next 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next two weeks.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {deadlines.map((r) => {
                  const daysLeft = Math.ceil(
                    (new Date(r.submission_deadline).getTime() - now.getTime()) / 86_400_000,
                  );
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/requirements/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {r.ref}
                      </Link>
                      <span className="text-muted-foreground">
                        {r.customer} · {formatDate(r.submission_deadline)} ·{" "}
                        {daysLeft <= 0 ? "due" : `in ${daysLeft}d`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Money outstanding by age</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {ageing.map((bucket) => (
                <li key={bucket.bucket} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{bucket.bucket}</span>
                  <span className="tabular-nums font-medium">{formatINR(bucket.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing waiting on a response. Run the generator on the{" "}
              <Link href="/tasks" className="text-primary hover:underline">
                Follow-ups
              </Link>{" "}
              screen to refresh.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {tasks.slice(0, 8).map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2">
                  <Link href="/tasks" className="hover:text-primary hover:underline">
                    {task.title}
                  </Link>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {task.due_date ? formatDate(task.due_date) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines that cannot be quoted yet</CardTitle>
        </CardHeader>
        <CardContent>
          {uncovered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every open line has firm cover. Nothing is blocked.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Firm</TableHead>
                  <TableHead className="text-right">Uncovered</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uncovered.map(({ line, coverage, requirement }) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Link
                        href={`/requirements/${requirement.id}`}
                        className="text-primary hover:underline"
                      >
                        {requirement.ref}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{line.part_number}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(coverage.required_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(coverage.firm_committed_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-danger-foreground">
                      {formatQty(coverage.uncovered_qty)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={COVERAGE_VARIANT[coverage.state]}
                        label={COVERAGE_LABEL[coverage.state]}
                      />
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
          <CardTitle>Documents expiring or expired</CardTitle>
        </CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">No document is near expiry.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {expiring.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <Link href="/documents?filter=attention" className="hover:text-primary hover:underline">
                    {d.title}
                  </Link>
                  <StatusBadge
                    variant={d.expiry_state === "expired" ? "danger" : "warning"}
                    label={
                      d.expiry_state === "expired"
                        ? `Expired ${Math.abs(d.days_left ?? 0)}d ago`
                        : `${d.days_left}d left`
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  tone?: "default" | "danger";
}) {
  const body = (
    <CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 tabular-nums text-2xl font-semibold " +
          (tone === "danger" ? "text-danger-foreground" : "")
        }
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </CardContent>
  );

  return (
    <Card className={href ? "transition-colors hover:border-primary" : undefined}>
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}
