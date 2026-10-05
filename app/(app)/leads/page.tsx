import { DemoBanner } from "@/components/demo-banner";
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
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  LEAD_STAGE_VARIANT,
} from "@/lib/constants";
import { createLeadAction, setLeadStageAction } from "@/lib/data/actions";
import { listLeads } from "@/lib/data/db";
import { formatDate } from "@/lib/format";
import type { LeadStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const leads = await listLeads();
  const today = new Date().toISOString().slice(0, 10);
  const isOpen = (stage: LeadStage) => stage !== "won" && stage !== "lost";

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Leads</h1>
      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Capture a lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLeadAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Source</Label>
              <Select name="source" required className="w-32">
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_SOURCE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="name" required placeholder="Contact name" className="w-44" />
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input name="company" placeholder="Company / agency" className="w-44" />
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
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select name="stage" defaultValue="new" className="w-32">
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STAGE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Add lead</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet. Capture the first one above, from a call, WhatsApp or referral.
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
                {leads.map((lead) => {
                  const due = lead.next_follow_up !== null && lead.next_follow_up <= today && isOpen(lead.stage);
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
    </div>
  );
}
