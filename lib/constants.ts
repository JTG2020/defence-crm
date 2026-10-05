import type {
  AppRole,
  CommitmentKind,
  CoverageState,
  DocumentType,
  LossReason,
  OemApprovalStatus,
  OrderStatus,
  QuoteStatus,
  RequirementStatus,
} from "./types";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

export const REQUIREMENT_STATUSES: RequirementStatus[] = [
  "received",
  "qualifying",
  "quoted",
  "submitted",
  "won",
  "lost",
  "cancelled",
];

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  received: "Received",
  qualifying: "Qualifying",
  quoted: "Quoted",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  cancelled: "Cancelled",
};

export const REQUIREMENT_STATUS_VARIANT: Record<RequirementStatus, StatusVariant> = {
  received: "info",
  qualifying: "warning",
  quoted: "info",
  submitted: "info",
  won: "success",
  lost: "danger",
  cancelled: "neutral",
};

export const COVERAGE_LABEL: Record<CoverageState, string> = {
  covered: "Covered",
  partly_covered: "Partly covered",
  no_cover: "No firm cover",
};

export const COVERAGE_VARIANT: Record<CoverageState, StatusVariant> = {
  covered: "success",
  partly_covered: "warning",
  no_cover: "danger",
};

export const COMMITMENT_LABEL: Record<CommitmentKind, string> = {
  firm: "Firm commitment",
  indicative: "Indication only",
};

export const COMMITMENT_VARIANT: Record<CommitmentKind, StatusVariant> = {
  firm: "success",
  indicative: "warning",
};

export const OEM_APPROVAL_LABEL: Record<OemApprovalStatus, string> = {
  approved: "Approved",
  conditional: "Conditional",
  not_approved: "Not approved",
};

export const OEM_APPROVAL_VARIANT: Record<OemApprovalStatus, StatusVariant> = {
  approved: "success",
  conditional: "warning",
  not_approved: "danger",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  superseded: "Superseded",
};

export const QUOTE_STATUS_VARIANT: Record<QuoteStatus, StatusVariant> = {
  draft: "neutral",
  pending_approval: "warning",
  approved: "success",
  rejected: "danger",
  superseded: "neutral",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Open",
  processing: "Processing",
  completed: "Completed",
};

export const ORDER_STATUS_VARIANT: Record<OrderStatus, StatusVariant> = {
  open: "info",
  processing: "warning",
  completed: "success",
};

export const LOSS_REASONS: LossReason[] = [
  "price",
  "technical_non_compliance",
  "delivery_timeline",
  "competitor_preference",
  "quantity_or_capacity",
  "cancelled",
  "not_pursued",
  "other",
];

export const LOSS_REASON_LABEL: Record<LossReason, string> = {
  price: "Price",
  technical_non_compliance: "Technical non-compliance",
  delivery_timeline: "Delivery timeline",
  competitor_preference: "Competitor preference",
  quantity_or_capacity: "Quantity or capacity",
  cancelled: "Cancelled",
  not_pursued: "Not pursued",
  other: "Other",
};

export const ROLES: AppRole[] = ["owner", "sales", "operations", "finance"];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  quotation: "Quotation",
  invoice: "Invoice",
  compliance_certificate: "Compliance certificate",
  technical_drawing: "Technical drawing",
  pdi_report: "PDI report",
  other: "Other",
};
