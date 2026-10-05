// Domain types. This file is the hand-written mirror of the SQL in supabase/migrations.
// Column names and enums match the database exactly so that wiring to Supabase later is
// a drop-in replacement of lib/seed/repository.ts, not a rewrite of the screens.

export type RequirementStatus =
  | "received"
  | "qualifying"
  | "quoted"
  | "submitted"
  | "won"
  | "lost"
  | "cancelled";

export type CommitmentKind = "firm" | "indicative";

export type OemApprovalStatus = "approved" | "conditional" | "not_approved";

export type QuoteStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "superseded";

export type LossReason =
  | "price"
  | "technical_non_compliance"
  | "delivery_timeline"
  | "competitor_preference"
  | "quantity_or_capacity"
  | "cancelled"
  | "not_pursued"
  | "other";

export type AppRole = "owner" | "sales" | "operations" | "finance";

export type DocumentType =
  | "quotation"
  | "invoice"
  | "compliance_certificate"
  | "technical_drawing"
  | "pdi_report"
  | "other";

export interface Requirement {
  id: string;
  ref: string;
  customer: string;
  status: RequirementStatus;
  submission_deadline: string;
  loss_reason: LossReason | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface RequirementLine {
  id: string;
  requirement_id: string;
  line_no: number;
  part_number: string;
  description: string;
  quantity: number;
  uom: string;
  deadline: string;
  is_demo: boolean;
}

export interface Oem {
  id: string;
  name: string;
  approval_status: OemApprovalStatus;
  lead_time_days: number;
  capabilities: string[];
  contact_name: string | null;
  contact_email: string | null;
  capacity_shared?: boolean;
  is_demo: boolean;
}

export interface OemProduct {
  id: string;
  oem_id: string;
  part_number: string;
  description: string;
  unit_price: number;
  currency: "INR";
  lead_time_days: number;
  declared_capacity?: number | null;
  is_demo: boolean;
}

export interface Commitment {
  id: string;
  requirement_line_id: string;
  oem_id: string;
  kind: CommitmentKind;
  quantity: number;
  unit_price: number;
  expected_date: string;
  shipment_seq: number;
  is_demo: boolean;
}

export interface OemRequest {
  id: string;
  requirement_line_id: string;
  oem_id: string;
  requested_at: string;
  responded_at: string | null;
  response_notes: string | null;
  is_demo: boolean;
}

export interface Quote {
  id: string;
  requirement_id: string;
  status: QuoteStatus;
  current_version: number;
  is_demo: boolean;
  created_at: string;
}

export interface QuoteVersion {
  id: string;
  quote_id: string;
  version_no: number;
  status: QuoteStatus;
  approved_at: string | null;
  is_demo: boolean;
}

export interface QuoteVersionLine {
  id: string;
  quote_version_id: string;
  requirement_line_id: string;
  oem_price: number;
  lead_time_days: number;
  target_margin_pct: number;
  // recommended_price is produced by the pricing view/function; final_price is always human-entered.
  recommended_price: number;
  final_price: number | null;
  is_demo: boolean;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  owner_type: "requirement" | "oem" | "order";
  owner_id: string;
  title: string;
  issue_date: string | null;
  expiry_date: string | null;
  is_demo: boolean;
}

// Coverage is a read model produced by the Postgres view (supabase/migrations).
// The UI never computes it; it reads rows of this shape.
export type CoverageState = "covered" | "partly_covered" | "no_cover";

export interface CoverageRow {
  requirement_line_id: string;
  required_qty: number;
  firm_committed_qty: number;
  indicative_qty: number;
  uncovered_qty: number;
  over_committed_qty: number;
  state: CoverageState;
  firm_by_oem: { oem_id: string; quantity: number }[];
}

export type OrderStatus = "open" | "processing" | "completed";
export type PdiStatus = "pending" | "passed" | "failed";
export type DispatchClearance = "approved" | "hold";
export type DeliveryStatus = "in_transit" | "delivered";

export interface Order {
  id: string;
  quote_id: string;
  requirement_id: string;
  po_ref: string | null;
  supplier_po_ref: string | null;
  po_number: string | null;
  po_date: string | null;
  po_value: number | null;
  taxes: number | null;
  status: OrderStatus;
  is_demo: boolean;
  created_at: string;
}

export interface OrderLine {
  id: string;
  order_id: string;
  requirement_line_id: string | null;
  part_number: string;
  quantity_ordered: number;
  unit_price: number;
  delivery_schedule: string | null;
  is_demo: boolean;
}

export interface OrderStage {
  id: string;
  order_id: string;
  stage: string;
  owner: string | null;
  expected_date: string | null;
  committed_date: string | null;
  completed_at: string | null;
  is_demo: boolean;
}

export interface PdiRecord {
  id: string;
  order_id: string;
  part_number: string | null;
  offered_qty: number;
  cleared_qty: number;
  rejected_qty: number;
  held: boolean;
  inspection_type: string | null;
  inspection_date: string | null;
  status: PdiStatus;
  dispatch_clearance: DispatchClearance;
  is_demo: boolean;
}

export interface Delivery {
  id: string;
  order_id: string;
  quantity: number;
  delivered_on: string;
  delivery_ref: string | null;
  grn_number: string | null;
  status: DeliveryStatus;
  acceptance: "accepted" | "rejected" | null;
  closure_status: "pending" | "closed";
  is_demo: boolean;
}

export type OemInvoiceStatus = "raised" | "submitted" | "approved" | "paid";
export type PaymentStatus = "pending" | "partial" | "completed";

export interface OemInvoice {
  id: string;
  order_id: string;
  invoice_no: string;
  gross_amount: number;
  due_date: string | null;
  invoice_date: string | null;
  oem_id: string | null;
  status: OemInvoiceStatus;
  is_demo: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  oem_invoice_id: string;
  amount: number;
  paid_on: string;
  kind: string;
  payment_ref: string | null;
  mode: string | null;
  is_demo: boolean;
}

export interface CommissionInvoice {
  id: string;
  commission_no: string;
  oem_invoice_id: string;
  oem_id: string;
  commission_pct: number;
  base_amount: number;
  commission_amount: number;
  gst_amount: number;
  gross_value: number;
  invoice_date: string;
  due_date: string | null;
  payment_status: "pending" | "paid";
  outstanding_amount: number | null;
  is_demo: boolean;
}

export type LeadSource = "call" | "whatsapp" | "referral" | "gem" | "portal" | "direct" | "other";
export type LeadStage = "new" | "contacted" | "qualified" | "quoted" | "won" | "lost";

export interface Lead {
  id: string;
  source: LeadSource;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  product_note: string | null;
  stage: LeadStage;
  next_follow_up: string | null;
  owner: string | null;
  converted_requirement_id: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  kind: string;
  title: string;
  owner_type: string | null;
  owner_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  dedupe_key: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface CommitOverride {
  requirement_line_id: string;
  quantity: number;
  reason: string;
  actor: string;
  created_at: string;
}
