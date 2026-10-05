import { format } from "date-fns";
import { expiryState } from "@/lib/dates";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  CommissionInvoice,
  Commitment,
  CoverageRow,
  CoverageState,
  Delivery,
  DocumentRecord,
  Lead,
  LossReason,
  Oem,
  OemInvoice,
  OemProduct,
  OemRequest,
  Order,
  OrderLine,
  OrderStage,
  Payment,
  PdiRecord,
  Quote,
  QuoteVersion,
  QuoteVersionLine,
  Requirement,
  RequirementLine,
  Task,
} from "@/lib/types";

const TERMINAL_STATUS = new Set(["won", "lost", "cancelled"]);

// The database-backed repository. Screens read these; RLS applies through the signed-in
// cookie session. Coverage is read from the Postgres view, never recomputed here.

async function client() {
  return createServerSupabase();
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return (data ?? ([] as unknown as T)) as T;
}

export async function listRequirements(): Promise<Requirement[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("requirements")
    .select("*")
    .order("submission_deadline", { ascending: false });
  return unwrap<Requirement[]>(data as Requirement[] | null, error);
}

export async function getRequirement(id: string): Promise<Requirement | null> {
  const supabase = await client();
  const { data, error } = await supabase.from("requirements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Requirement | null) ?? null;
}

export async function listLinesForRequirement(requirementId: string): Promise<RequirementLine[]> {
  return listLinesForRequirements([requirementId]);
}

export async function listLinesForRequirements(
  requirementIds: string[],
): Promise<RequirementLine[]> {
  if (requirementIds.length === 0) return [];
  const supabase = await client();
  const { data, error } = await supabase
    .from("requirement_lines")
    .select("*")
    .in("requirement_id", requirementIds)
    .order("line_no", { ascending: true });
  return unwrap<RequirementLine[]>(data as RequirementLine[] | null, error);
}

export async function getCoverageForLines(lineIds: string[]): Promise<CoverageRow[]> {
  if (lineIds.length === 0) return [];
  const supabase = await client();
  const [coverage, byOem] = await Promise.all([
    supabase.from("requirement_line_coverage").select("*").in("requirement_line_id", lineIds),
    supabase.from("requirement_line_firm_by_oem").select("*").in("requirement_line_id", lineIds),
  ]);
  if (coverage.error) throw new Error(coverage.error.message);
  if (byOem.error) throw new Error(byOem.error.message);

  const grouped = new Map<string, { oem_id: string; quantity: number }[]>();
  for (const row of (byOem.data ?? []) as {
    requirement_line_id: string;
    oem_id: string;
    quantity: number;
  }[]) {
    const list = grouped.get(row.requirement_line_id) ?? [];
    list.push({ oem_id: row.oem_id, quantity: row.quantity });
    grouped.set(row.requirement_line_id, list);
  }

  return ((coverage.data ?? []) as {
    requirement_line_id: string;
    required_qty: number;
    firm_committed_qty: number;
    indicative_qty: number;
    uncovered_qty: number;
    over_committed_qty: number;
    state: CoverageState;
  }[]).map((row) => ({
    requirement_line_id: row.requirement_line_id,
    required_qty: row.required_qty,
    firm_committed_qty: row.firm_committed_qty,
    indicative_qty: row.indicative_qty,
    uncovered_qty: row.uncovered_qty,
    over_committed_qty: row.over_committed_qty,
    state: row.state,
    firm_by_oem: grouped.get(row.requirement_line_id) ?? [],
  }));
}

export async function listCommitmentsForLines(lineIds: string[]): Promise<Commitment[]> {
  if (lineIds.length === 0) return [];
  const supabase = await client();
  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .in("requirement_line_id", lineIds)
    .order("shipment_seq", { ascending: true });
  return unwrap<Commitment[]>(data as Commitment[] | null, error);
}

export async function listOemRequestsForLines(lineIds: string[]): Promise<OemRequest[]> {
  if (lineIds.length === 0) return [];
  const supabase = await client();
  const { data, error } = await supabase
    .from("oem_requests")
    .select("*")
    .in("requirement_line_id", lineIds);
  return unwrap<OemRequest[]>(data as OemRequest[] | null, error);
}

export async function listOemRequestsAll(): Promise<OemRequest[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("oem_requests").select("*");
  return unwrap<OemRequest[]>(data as OemRequest[] | null, error);
}

export async function listOems(): Promise<Oem[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("oems").select("*").order("name");
  return unwrap<Oem[]>(data as Oem[] | null, error);
}

export async function getOem(id: string): Promise<Oem | null> {
  const supabase = await client();
  const { data, error } = await supabase.from("oems").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Oem | null) ?? null;
}

export interface CommitmentWithRequirement extends Commitment {
  requirement_id: string;
  requirement_ref: string;
  part_number: string;
}

export async function listCommitmentsForOem(oemId: string): Promise<CommitmentWithRequirement[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("commitments")
    .select("*, requirement_line:requirement_lines(requirement_id, part_number)")
    .eq("oem_id", oemId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as (Commitment & {
    requirement_line: { requirement_id: string; part_number: string } | null;
  })[];
  const requirementIds = [...new Set(rows.map((r) => r.requirement_line?.requirement_id).filter(Boolean))] as string[];
  const refById = new Map<string, string>();
  if (requirementIds.length > 0) {
    const { data: reqs, error: reqError } = await supabase
      .from("requirements")
      .select("id, ref")
      .in("id", requirementIds);
    if (reqError) throw new Error(reqError.message);
    for (const r of (reqs ?? []) as { id: string; ref: string }[]) refById.set(r.id, r.ref);
  }

  return rows.map((row) => ({
    ...row,
    requirement_id: row.requirement_line?.requirement_id ?? "",
    requirement_ref: refById.get(row.requirement_line?.requirement_id ?? "") ?? "—",
    part_number: row.requirement_line?.part_number ?? "—",
  }));
}

export async function listOemRequestsForOem(oemId: string): Promise<OemRequest[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("oem_requests").select("*").eq("oem_id", oemId);
  return unwrap<OemRequest[]>(data as OemRequest[] | null, error);
}

export async function listDocumentsForOwner(
  ownerType: string,
  ownerId: string,
): Promise<DocumentRecord[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId);
  return unwrap<DocumentRecord[]>(data as DocumentRecord[] | null, error);
}

export interface OemProductCapacity {
  oem_product_id: string;
  oem_id: string;
  part_number: string;
  declared_capacity: number | null;
  firm_committed: number;
  available: number | null;
  over_committed: number;
}

export async function listOemProductCapacity(oemId?: string): Promise<OemProductCapacity[]> {
  const supabase = await client();
  let query = supabase.from("oem_product_capacity").select("*").order("part_number");
  if (oemId) query = query.eq("oem_id", oemId);
  const { data, error } = await query;
  return unwrap<OemProductCapacity[]>(data as OemProductCapacity[] | null, error);
}

export async function listOemProducts(oemId?: string): Promise<OemProduct[]> {
  const supabase = await client();
  let query = supabase.from("oem_products").select("*").order("part_number");
  if (oemId) query = query.eq("oem_id", oemId);
  const { data, error } = await query;
  return unwrap<OemProduct[]>(data as OemProduct[] | null, error);
}

export async function listCommitments(): Promise<Commitment[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("commitments").select("*").order("expected_date");
  return unwrap<Commitment[]>(data as Commitment[] | null, error);
}

export async function listQuotes(): Promise<Quote[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });
  return unwrap<Quote[]>(data as Quote[] | null, error);
}

export async function getQuoteForRequirement(requirementId: string): Promise<Quote | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("requirement_id", requirementId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Quote | null) ?? null;
}

export async function getQuoteVersions(quoteId: string): Promise<QuoteVersion[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("quote_versions")
    .select("*")
    .eq("quote_id", quoteId)
    .order("version_no", { ascending: false });
  return unwrap<QuoteVersion[]>(data as QuoteVersion[] | null, error);
}

export async function getQuoteLines(quoteVersionId: string): Promise<QuoteVersionLine[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("quote_version_lines")
    .select("*")
    .eq("quote_version_id", quoteVersionId);
  return unwrap<QuoteVersionLine[]>(data as QuoteVersionLine[] | null, error);
}

export async function listOemInvoices(): Promise<OemInvoice[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("oem_invoices")
    .select("*")
    .order("invoice_date", { ascending: false });
  return unwrap<OemInvoice[]>(data as OemInvoice[] | null, error);
}

export async function listPayments(): Promise<Payment[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("payments").select("*");
  return unwrap<Payment[]>(data as Payment[] | null, error);
}

export interface AuditEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string | null;
  at: string;
}

export async function listAuditLog(limit = 100): Promise<AuditEntry[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id,entity_type,entity_id,action,actor,at")
    .order("at", { ascending: false })
    .limit(limit);
  return unwrap<AuditEntry[]>(data as AuditEntry[] | null, error);
}

export async function listUpcomingDeadlines(days = 14, now: Date = new Date()): Promise<Requirement[]> {
  const requirements = await listRequirements();
  const limit = new Date(now.getTime() + days * 86_400_000);
  return requirements
    .filter((r) => !TERMINAL_STATUS.has(r.status))
    .filter((r) => {
      const due = new Date(r.submission_deadline);
      return due >= now && due <= limit;
    })
    .sort((a, b) => (a.submission_deadline < b.submission_deadline ? -1 : 1));
}

export interface InvoiceAgeing {
  bucket: string;
  amount: number;
}

export async function invoiceAgeing(now: Date = new Date()): Promise<InvoiceAgeing[]> {
  const invoices = await listOemInvoicesWithBalance();
  const buckets: Record<string, number> = {
    "Not yet due": 0,
    "1-30 days late": 0,
    "31-60 days late": 0,
    "Over 60 days late": 0,
  };
  for (const invoice of invoices) {
    if (invoice.outstanding <= 0 || !invoice.due_date) continue;
    const daysLate = Math.floor((now.getTime() - new Date(invoice.due_date).getTime()) / 86_400_000);
    if (daysLate <= 0) buckets["Not yet due"] += invoice.outstanding;
    else if (daysLate <= 30) buckets["1-30 days late"] += invoice.outstanding;
    else if (daysLate <= 60) buckets["31-60 days late"] += invoice.outstanding;
    else buckets["Over 60 days late"] += invoice.outstanding;
  }
  return Object.entries(buckets).map(([bucket, amount]) => ({ bucket, amount }));
}

export interface HistoryResult {
  requirement: Requirement;
  matched_line_parts: string[];
}

// Search history over the header fields and part numbers. Returns only matches; when there are
// none the caller shows "no comparable" rather than guessing (docs/PRD.md A8).
export async function searchHistory(query: string): Promise<HistoryResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const pattern = `%${trimmed.replace(/,/g, " ")}%`;
  const supabase = await client();

  const [headerRes, lineRes] = await Promise.all([
    supabase
      .from("requirements")
      .select("*")
      .or(`ref.ilike.${pattern},customer.ilike.${pattern},notes.ilike.${pattern}`),
    supabase.from("requirement_lines").select("*").ilike("part_number", pattern),
  ]);
  if (headerRes.error) throw new Error(headerRes.error.message);
  if (lineRes.error) throw new Error(lineRes.error.message);

  const byId = new Map<string, Requirement>();
  for (const r of (headerRes.data ?? []) as Requirement[]) byId.set(r.id, r);
  const matchedLines = (lineRes.data ?? []) as RequirementLine[];

  const missingIds = [...new Set(matchedLines.map((l) => l.requirement_id))].filter(
    (id) => !byId.has(id),
  );
  if (missingIds.length > 0) {
    const { data, error } = await supabase.from("requirements").select("*").in("id", missingIds);
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as Requirement[]) byId.set(r.id, r);
  }

  const partsByRequirement = new Map<string, string[]>();
  for (const line of matchedLines) {
    const parts = partsByRequirement.get(line.requirement_id) ?? [];
    parts.push(line.part_number);
    partsByRequirement.set(line.requirement_id, parts);
  }

  return [...byId.values()]
    .map((requirement) => ({
      requirement,
      matched_line_parts: partsByRequirement.get(requirement.id) ?? [],
    }))
    .sort((a, b) =>
      a.requirement.submission_deadline < b.requirement.submission_deadline ? 1 : -1,
    );
}

// The leads table arrives with migration 0016. Until it is applied (rollout window), treat a
// missing table as "no leads yet" and log it, rather than breaking Today and the Leads screen.
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    /could not find the table|does not exist|schema cache/i.test(error.message ?? "")
  );
}

export async function listLeads(): Promise<Lead[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) {
      console.warn("[db] leads table missing - apply migration 0016_leads.sql");
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as Lead[];
}

// Leads that are still open and whose follow-up date is today or past.
export async function listLeadFollowUpsDue(now: Date = new Date()): Promise<Lead[]> {
  const supabase = await client();
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .not("stage", "in", "(won,lost)")
    .not("next_follow_up", "is", null)
    .lte("next_follow_up", today)
    .order("next_follow_up", { ascending: true });
  if (error) {
    if (isMissingTable(error)) {
      console.warn("[db] leads table missing - apply migration 0016_leads.sql");
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as Lead[];
}

export async function listTasks(): Promise<Task[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .is("completed_at", null)
    .order("due_date", { ascending: true });
  return unwrap<Task[]>(data as Task[] | null, error);
}

export interface OemInvoiceWithBalance extends OemInvoice {
  paid: number;
  outstanding: number;
}

export async function listOemInvoicesWithBalance(): Promise<OemInvoiceWithBalance[]> {
  const [invoices, payments] = await Promise.all([listOemInvoices(), listPayments()]);
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    paidByInvoice.set(p.oem_invoice_id, (paidByInvoice.get(p.oem_invoice_id) ?? 0) + p.amount);
  }
  return invoices.map((invoice) => {
    const paid = paidByInvoice.get(invoice.id) ?? 0;
    return { ...invoice, paid, outstanding: Math.max(0, invoice.gross_amount - paid) };
  });
}

export async function listCommissionInvoices(): Promise<CommissionInvoice[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("commission_invoices")
    .select("*")
    .order("invoice_date", { ascending: false });
  return unwrap<CommissionInvoice[]>(data as CommissionInvoice[] | null, error);
}

export async function listOrders(): Promise<Order[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  return unwrap<Order[]>(data as Order[] | null, error);
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = await client();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Order | null) ?? null;
}

export async function getOrderForQuote(quoteId: string): Promise<Order | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("quote_id", quoteId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Order | null) ?? null;
}

export async function listOrderLines(orderId: string): Promise<OrderLine[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("order_lines").select("*").eq("order_id", orderId);
  return unwrap<OrderLine[]>(data as OrderLine[] | null, error);
}

export async function listAllOrderStages(): Promise<OrderStage[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("order_stages").select("*");
  return unwrap<OrderStage[]>(data as OrderStage[] | null, error);
}

export async function listOrderStages(orderId: string): Promise<OrderStage[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("order_stages")
    .select("*")
    .eq("order_id", orderId)
    .order("expected_date", { ascending: true });
  return unwrap<OrderStage[]>(data as OrderStage[] | null, error);
}

export async function listPdiRecords(orderId: string): Promise<PdiRecord[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("pdi_records").select("*").eq("order_id", orderId);
  return unwrap<PdiRecord[]>(data as PdiRecord[] | null, error);
}

export async function listDeliveries(orderId: string): Promise<Delivery[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("order_id", orderId)
    .order("delivered_on", { ascending: true });
  return unwrap<Delivery[]>(data as Delivery[] | null, error);
}

export interface UncoveredLine {
  line: RequirementLine;
  coverage: CoverageRow;
  requirement: Requirement;
}

// Uncovered balances that still matter: closed requirements need no cover.
export async function listUncoveredLines(): Promise<UncoveredLine[]> {
  const requirements = await listRequirements();
  const active = requirements.filter((r) => !TERMINAL_STATUS.has(r.status));
  if (active.length === 0) return [];
  const lines = await listLinesForRequirements(active.map((r) => r.id));
  if (lines.length === 0) return [];
  const coverage = await getCoverageForLines(lines.map((l) => l.id));
  const coverageByLine = new Map(coverage.map((c) => [c.requirement_line_id, c]));
  const requirementById = new Map(active.map((r) => [r.id, r]));

  const result: UncoveredLine[] = [];
  for (const line of lines) {
    const cov = coverageByLine.get(line.id);
    const requirement = requirementById.get(line.requirement_id);
    if (cov && requirement && cov.uncovered_qty > 0) {
      result.push({ line, coverage: cov, requirement });
    }
  }
  return result;
}

export interface DocumentStatus {
  id: string;
  title: string;
  type: string;
  expiry_state: "valid" | "expiring" | "expired" | "none";
  days_left: number | null;
}

export async function documentsWithStatus(now: Date = new Date()): Promise<DocumentStatus[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("documents").select("id,title,type,expiry_date");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    title: string;
    type: string;
    expiry_date: string | null;
  }[];
  return rows.map((d) => {
    if (!d.expiry_date) {
      return { id: d.id, title: d.title, type: d.type, expiry_state: "none", days_left: null };
    }
    return {
      id: d.id,
      title: d.title,
      type: d.type,
      expiry_state: expiryState(d.expiry_date, now),
      days_left: Math.round((new Date(d.expiry_date).getTime() - now.getTime()) / 86_400_000),
    };
  });
}

export interface DashboardData {
  openRequirements: number;
  quotesAwaitingResponse: number;
  oemResponsesPending: number;
  openOrders: number;
  paymentsPending: number;
  paymentsPendingAmount: number;
  followupsOpen: number;
  leadFollowUpsDue: number;
  documentsExpiring: number;
  ordersAtRisk: number;
  uncoveredLines: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  pipeline: { received: number; quoted: number; submitted: number; won: number };
  openOrdersByStage: { stage: string; count: number }[];
  winLoss: { month: string; won: number; lost: number }[];
  lossReasons: { reason: LossReason; count: number }[];
}

export async function dashboard(now: Date = new Date()): Promise<DashboardData> {
  const supabase = await client();
  const [requirements, quotesRes, requestsRes, ordersRes, stagesRes, invoices, tasks, leadFollowUps, docs, uncovered] =
    await Promise.all([
      listRequirements(),
      supabase.from("quotes").select("status"),
      supabase.from("oem_requests").select("responded_at"),
      supabase.from("orders").select("id,status"),
      supabase.from("order_stages").select("*"),
      listOemInvoicesWithBalance(),
      listTasks(),
      listLeadFollowUpsDue(now),
      documentsWithStatus(now),
      listUncoveredLines(),
    ]);
  if (quotesRes.error) throw new Error(quotesRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (stagesRes.error) throw new Error(stagesRes.error.message);

  const openRequirements = requirements.filter((r) => !TERMINAL_STATUS.has(r.status)).length;

  const quotesAwaitingResponse = ((quotesRes.data ?? []) as { status: string }[]).filter(
    (q) => q.status === "draft" || q.status === "pending_approval",
  ).length;

  const oemResponsesPending = ((requestsRes.data ?? []) as { responded_at: string | null }[]).filter(
    (r) => r.responded_at === null,
  ).length;

  const openOrderRows = ((ordersRes.data ?? []) as { id: string; status: string }[]).filter(
    (o) => o.status !== "completed",
  );
  const openOrders = openOrderRows.length;
  const stages = (stagesRes.data ?? []) as OrderStage[];

  const ordersAtRisk = openOrderRows.filter((o) =>
    stages.some(
      (s) =>
        s.order_id === o.id &&
        !s.completed_at &&
        s.expected_date &&
        s.committed_date &&
        s.expected_date > s.committed_date,
    ),
  ).length;

  const stagesByOrder = new Map<string, OrderStage[]>();
  for (const stage of stages) {
    const list = stagesByOrder.get(stage.order_id) ?? [];
    list.push(stage);
    stagesByOrder.set(stage.order_id, list);
  }
  const stageCounts = new Map<string, number>();
  for (const order of openOrderRows) {
    const pending = (stagesByOrder.get(order.id) ?? [])
      .filter((s) => !s.completed_at)
      .sort((a, b) => (a.expected_date ?? "9999").localeCompare(b.expected_date ?? "9999"));
    const current = pending[0]?.stage ?? "unstarted";
    stageCounts.set(current, (stageCounts.get(current) ?? 0) + 1);
  }
  const openOrdersByStage = [...stageCounts.entries()].map(([stage, count]) => ({ stage, count }));

  const paymentsPending = invoices.filter((i) => i.outstanding > 0).length;
  const paymentsPendingAmount = invoices
    .filter((i) => i.outstanding > 0)
    .reduce((sum, i) => sum + i.outstanding, 0);
  const followupsOpen = tasks.length;
  const leadFollowUpsDue = leadFollowUps.length;

  const winCount = requirements.filter((r) => r.status === "won").length;
  const lossCount = requirements.filter((r) => r.status === "lost").length;
  const winRate = winCount + lossCount > 0 ? Math.round((winCount / (winCount + lossCount)) * 100) : 0;
  const pipeline = {
    received: requirements.filter((r) => r.status === "received").length,
    quoted: requirements.filter((r) => r.status === "quoted").length,
    submitted: requirements.filter((r) => r.status === "submitted").length,
    won: winCount,
  };

  const documentsExpiring = docs.filter(
    (d) => d.expiry_state === "expiring" || d.expiry_state === "expired",
  ).length;

  const byMonth = new Map<string, { won: number; lost: number }>();
  for (const r of requirements) {
    if (r.status !== "won" && r.status !== "lost") continue;
    const month = format(new Date(r.submission_deadline), "MMM yyyy");
    const bucket = byMonth.get(month) ?? { won: 0, lost: 0 };
    if (r.status === "won") bucket.won += 1;
    else bucket.lost += 1;
    byMonth.set(month, bucket);
  }
  const winLoss = [...byMonth.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const lossCounts = new Map<LossReason, number>();
  for (const r of requirements) {
    if (r.status === "lost" && r.loss_reason) {
      lossCounts.set(r.loss_reason, (lossCounts.get(r.loss_reason) ?? 0) + 1);
    }
  }
  const lossReasons = [...lossCounts.entries()].map(([reason, count]) => ({ reason, count }));

  return {
    openRequirements,
    quotesAwaitingResponse,
    oemResponsesPending,
    openOrders,
    paymentsPending,
    paymentsPendingAmount,
    followupsOpen,
    leadFollowUpsDue,
    documentsExpiring,
    ordersAtRisk,
    uncoveredLines: uncovered.length,
    winCount,
    lossCount,
    winRate,
    pipeline,
    openOrdersByStage,
    winLoss,
    lossReasons,
  };
}
