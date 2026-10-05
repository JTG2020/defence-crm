import type {
  Commitment,
  DocumentRecord,
  Oem,
  OemProduct,
  OemRequest,
  Quote,
  QuoteVersion,
  QuoteVersionLine,
  Requirement,
  RequirementLine,
} from "../types";
import { recommendedPrice, DEFAULT_TARGET_MARGIN_PCT } from "../pricing";

// Anchored "today" so the demo and its tests are deterministic and coherent.
export const DEMO_NOW = new Date("2026-10-05T00:00:00.000Z");

const req = (
  id: string,
  ref: string,
  customer: string,
  status: Requirement["status"],
  submission_deadline: string,
  loss_reason: Requirement["loss_reason"] = null,
): Requirement => ({
  id,
  ref,
  customer,
  status,
  submission_deadline,
  loss_reason,
  notes: null,
  is_demo: true,
  created_at: submission_deadline,
});

const line = (
  requirement_id: string,
  line_no: number,
  part_number: string,
  description: string,
  quantity: number,
  uom: string,
  deadline: string,
): RequirementLine => ({
  id: `${requirement_id}-L${line_no}`,
  requirement_id,
  line_no,
  part_number,
  description,
  quantity,
  uom,
  deadline,
  is_demo: true,
});

export const requirements: Requirement[] = [
  req("req-001", "REQ-2026-001", "Customer A", "won", "2026-08-15"),
  req("req-002", "REQ-2026-002", "Customer B", "lost", "2026-08-28", "price"),
  req("req-003", "REQ-2026-003", "Customer A", "quoted", "2026-09-30"),
  req("req-004", "REQ-2026-004", "Customer C", "submitted", "2026-10-20"),
  req("req-005", "REQ-2026-005", "Customer B", "received", "2026-11-05"),
  req("req-006", "REQ-2026-006", "Customer A", "qualifying", "2026-10-12"),
  req("req-007", "REQ-2026-007", "Customer C", "won", "2026-09-10"),
  req("req-008", "REQ-2026-008", "Customer B", "lost", "2026-09-22", "technical_non_compliance"),
  req("req-009", "REQ-2026-009", "Customer A", "cancelled", "2026-10-01"),
  req("req-010", "REQ-2026-010", "Customer C", "submitted", "2026-11-18"),
  req("req-011", "REQ-2026-011", "Customer B", "quoted", "2026-10-25"),
  req("req-012", "REQ-2026-012", "Customer A", "lost", "2026-10-30", "competitor_preference"),
];

export const requirementLines: RequirementLine[] = [
  line("req-001", 1, "PN-1001", "Hydraulic actuator assembly", 1000, "nos", "2026-09-30"),
  line("req-001", 2, "PN-1002", "Seal kit, high pressure", 200, "nos", "2026-09-30"),
  line("req-002", 1, "PN-2001", "Control valve, 4-way", 300, "nos", "2026-10-10"),
  line("req-003", 1, "PN-2002", "Servo drive unit", 500, "nos", "2026-10-25"),
  line("req-003", 2, "PN-2003", "Feedback encoder", 150, "nos", "2026-10-25"),
  line("req-004", 1, "PN-4001", "Power supply module", 400, "nos", "2026-11-10"),
  line("req-005", 1, "PN-3003", "Signal conditioner", 250, "nos", "2026-11-25"),
  line("req-006", 1, "PN-1001", "Hydraulic actuator assembly", 600, "nos", "2026-11-01"),
  line("req-007", 1, "PN-7001", "Test bench harness", 120, "sets", "2026-10-15"),
  line("req-008", 1, "PN-8001", "Optical sight bracket", 80, "nos", "2026-10-20"),
  line("req-009", 1, "PN-9001", "Cable loom assembly", 500, "nos", "2026-10-20"),
  line("req-010", 1, "PN-4001", "Power supply module", 100, "nos", "2026-12-05"),
  line("req-011", 1, "PN-2002", "Servo drive unit", 300, "nos", "2026-11-20"),
  line("req-012", 1, "PN-1201", "Machined housing", 900, "nos", "2026-11-15"),
];

export const oems: Oem[] = [
  {
    id: "oem-a",
    name: "OEM A",
    approval_status: "approved",
    lead_time_days: 45,
    capabilities: ["Hydraulics", "Actuators", "Seals"],
    contact_name: "Contact A",
    contact_email: null,
    is_demo: true,
  },
  {
    id: "oem-b",
    name: "OEM B",
    approval_status: "approved",
    lead_time_days: 30,
    capabilities: ["Electronics", "Power supplies", "Encoders"],
    contact_name: "Contact B",
    contact_email: null,
    is_demo: true,
  },
  {
    id: "oem-c",
    name: "OEM C",
    approval_status: "conditional",
    lead_time_days: 60,
    capabilities: ["Servo drives", "Motion control"],
    contact_name: "Contact C",
    contact_email: null,
    is_demo: true,
  },
  {
    id: "oem-d",
    name: "OEM D",
    approval_status: "not_approved",
    lead_time_days: 90,
    capabilities: ["Optics", "Machining"],
    contact_name: null,
    contact_email: null,
    is_demo: true,
  },
  {
    id: "oem-e",
    name: "OEM E",
    approval_status: "approved",
    lead_time_days: 20,
    capabilities: ["Cable assemblies", "Harnesses"],
    contact_name: "Contact E",
    contact_email: null,
    is_demo: true,
  },
];

export const oemProducts: OemProduct[] = [
  p("oem-a", "PN-1001", "Hydraulic actuator assembly", 42000, 45),
  p("oem-a", "PN-1002", "Seal kit, high pressure", 3500, 30),
  p("oem-a", "PN-2002", "Servo drive unit", 51000, 60),
  p("oem-b", "PN-1001", "Hydraulic actuator assembly (licensed)", 44500, 30),
  p("oem-b", "PN-2002", "Servo drive unit", 49500, 45),
  p("oem-b", "PN-2003", "Feedback encoder", 7800, 25),
  p("oem-b", "PN-4001", "Power supply module", 16500, 30),
  p("oem-c", "PN-2002", "Servo drive unit", 52000, 60),
  p("oem-c", "PN-3003", "Signal conditioner", 9200, 55),
  p("oem-e", "PN-7001", "Test bench harness", 6400, 20),
  p("oem-e", "PN-9001", "Cable loom assembly", 2100, 20),
];

function p(
  oem_id: string,
  part_number: string,
  description: string,
  unit_price: number,
  lead_time_days: number,
): OemProduct {
  return {
    id: `${oem_id}-${part_number}`,
    oem_id,
    part_number,
    description,
    unit_price,
    currency: "INR",
    lead_time_days,
    is_demo: true,
  };
}

export const commitments: Commitment[] = [
  // COV-01: 1000 = 600 firm (OEM A) + 400 firm (OEM B) -> covered.
  com("req-001-L1", "oem-a", "firm", 600, 42000, "2026-09-20", 1),
  com("req-001-L1", "oem-b", "firm", 400, 44500, "2026-09-25", 1),
  com("req-001-L2", "oem-a", "firm", 200, 3500, "2026-09-18", 1),
  // COV-03: 500 = 300 firm, 200 indicative -> partly covered, uncovered 200.
  com("req-003-L1", "oem-a", "firm", 300, 51000, "2026-10-20", 1),
  com("req-003-L1", "oem-c", "indicative", 200, 52000, "2026-10-22", 1),
  com("req-003-L2", "oem-b", "firm", 150, 7800, "2026-10-18", 1),
  com("req-004-L1", "oem-b", "firm", 400, 16500, "2026-11-05", 1),
  // COV-04: multi-shipment 300 + 300 from one OEM -> counts once, covered.
  com("req-006-L1", "oem-a", "firm", 300, 42000, "2026-10-25", 1),
  com("req-006-L1", "oem-a", "firm", 300, 42000, "2026-11-05", 2),
  com("req-007-L1", "oem-e", "firm", 120, 6400, "2026-10-10", 1),
  com("req-010-L1", "oem-b", "firm", 100, 16500, "2026-12-01", 1),
  // COV-02/05: 300 = 120 firm -> partly covered, uncovered 180.
  com("req-011-L1", "oem-b", "firm", 120, 49500, "2026-11-10", 1),
  com("req-011-L1", "oem-c", "indicative", 150, 52000, "2026-11-15", 1),
  // COV-05/07 (no cover): 900 = 0 firm, only an indication.
  com("req-012-L1", "oem-a", "indicative", 900, 42000, "2026-11-20", 1),
];

function com(
  requirement_line_id: string,
  oem_id: string,
  kind: Commitment["kind"],
  quantity: number,
  unit_price: number,
  expected_date: string,
  shipment_seq: number,
): Commitment {
  return {
    id: `${requirement_line_id}-${oem_id}-${shipment_seq}`,
    requirement_line_id,
    oem_id,
    kind,
    quantity,
    unit_price,
    expected_date,
    shipment_seq,
    is_demo: true,
  };
}

export const oemRequests: OemRequest[] = [
  req0("req-001-L1", "oem-a", "2026-08-02", "2026-08-05"),
  req0("req-001-L1", "oem-b", "2026-08-02", "2026-08-09"),
  req0("req-003-L1", "oem-a", "2026-09-01", "2026-09-04"),
  req0("req-003-L1", "oem-c", "2026-09-01", null),
  req0("req-005-L1", "oem-c", "2026-09-20", null),
  req0("req-011-L1", "oem-b", "2026-09-15", "2026-09-18"),
  req0("req-011-L1", "oem-c", "2026-09-15", null),
];

function req0(
  requirement_line_id: string,
  oem_id: string,
  requested_at: string,
  responded_at: string | null,
): OemRequest {
  return {
    id: `${requirement_line_id}-${oem_id}`,
    requirement_line_id,
    oem_id,
    requested_at,
    responded_at,
    response_notes: responded_at ? "Quoted as requested." : null,
    is_demo: true,
  };
}

export const quotes: Quote[] = [
  { id: "q-001", requirement_id: "req-001", status: "approved", current_version: 2, is_demo: true, created_at: "2026-08-06" },
  { id: "q-003", requirement_id: "req-003", status: "draft", current_version: 1, is_demo: true, created_at: "2026-09-05" },
  { id: "q-007", requirement_id: "req-007", status: "approved", current_version: 1, is_demo: true, created_at: "2026-09-02" },
  { id: "q-011", requirement_id: "req-011", status: "pending_approval", current_version: 1, is_demo: true, created_at: "2026-09-20" },
];

export const quoteVersions: QuoteVersion[] = [
  { id: "qv-001-1", quote_id: "q-001", version_no: 1, status: "superseded", approved_at: "2026-08-06", is_demo: true },
  { id: "qv-001-2", quote_id: "q-001", version_no: 2, status: "approved", approved_at: "2026-08-09", is_demo: true },
  { id: "qv-003-1", quote_id: "q-003", version_no: 1, status: "draft", approved_at: null, is_demo: true },
  { id: "qv-007-1", quote_id: "q-007", version_no: 1, status: "approved", approved_at: "2026-09-03", is_demo: true },
  { id: "qv-011-1", quote_id: "q-011", version_no: 1, status: "pending_approval", approved_at: null, is_demo: true },
];

export const quoteVersionLines: QuoteVersionLine[] = buildQuoteLines();

function buildQuoteLines(): QuoteVersionLine[] {
  const rows: QuoteVersionLine[] = [];
  const add = (
    quote_version_id: string,
    requirement_line_id: string,
    oem_price: number,
    lead_time_days: number,
    final_price: number | null,
  ) => {
    const margin = DEFAULT_TARGET_MARGIN_PCT;
    rows.push({
      id: `${quote_version_id}-${requirement_line_id}`,
      quote_version_id,
      requirement_line_id,
      oem_price,
      lead_time_days,
      target_margin_pct: margin,
      recommended_price: recommendedPrice(oem_price, margin),
      final_price,
      is_demo: true,
    });
  };
  add("qv-001-1", "req-001-L1", 42000, 45, null);
  add("qv-001-2", "req-001-L1", 42000, 45, 48300);
  add("qv-001-2", "req-001-L2", 3500, 30, 4025);
  add("qv-003-1", "req-003-L1", 51000, 60, null);
  add("qv-003-1", "req-003-L2", 7800, 25, null);
  add("qv-007-1", "req-007-L1", 6400, 20, 7360);
  add("qv-011-1", "req-011-L1", 49500, 45, null);
  return rows;
}

export const documents: DocumentRecord[] = [
  doc("doc-1", "compliance_certificate", "oem", "oem-a", "OEM A compliance certificate", "2026-06-01", "2026-11-15"),
  doc("doc-2", "compliance_certificate", "oem", "oem-b", "OEM B compliance certificate", "2026-06-01", "2027-06-01"),
  doc("doc-3", "compliance_certificate", "oem", "oem-c", "OEM C compliance certificate", "2024-09-01", "2026-09-01"),
  doc("doc-4", "quotation", "requirement", "req-001", "Quotation REQ-2026-001 v2", "2026-08-09", null),
  doc("doc-5", "pdi_report", "order", "req-007", "PDI report REQ-2026-007", "2026-10-01", null),
];

function doc(
  id: string,
  type: DocumentRecord["type"],
  owner_type: DocumentRecord["owner_type"],
  owner_id: string,
  title: string,
  issue_date: string | null,
  expiry_date: string | null,
): DocumentRecord {
  return { id, type, owner_type, owner_id, title, issue_date, expiry_date, is_demo: true };
}
