import { z } from "zod";
import { isISODateString } from "./dates";
import { LOSS_REASONS, REQUIREMENT_STATUSES } from "./constants";

const isoDate = z
  .string()
  .refine(isISODateString, { message: "Enter a valid date (YYYY-MM-DD)" });

export const lineSchema = z.object({
  part_number: z.string().trim().min(1, { message: "Part number is required" }),
  description: z.string().trim().default(""),
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number" })
    .positive({ message: "Quantity must be greater than zero" }),
  uom: z.string().trim().min(1, { message: "Unit of measure is required" }),
  deadline: isoDate,
});

export const requirementSchema = z
  .object({
    ref: z.string().trim().min(1, { message: "Reference is required" }),
    customer: z.string().trim().min(1, { message: "Customer is required" }),
    submission_deadline: isoDate,
    status: z.enum(REQUIREMENT_STATUSES),
    lines: z.array(lineSchema).min(1, { message: "At least one line item is required" }),
  })
  .refine(
    (value) =>
      value.lines.every((line) => line.deadline >= value.submission_deadline),
    {
      message: "A line deadline cannot fall before the submission deadline",
      path: ["lines"],
    },
  );

export type RequirementInput = z.input<typeof requirementSchema>;
export type RequirementParsed = z.output<typeof requirementSchema>;

export const commitmentSchema = z.object({
  requirement_line_id: z.string().min(1),
  oem_id: z.string().min(1),
  kind: z.enum(["firm", "indicative"]),
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number" })
    .positive({ message: "Quantity must be greater than zero" }),
  unit_price: z.coerce.number().nonnegative(),
  expected_date: isoDate,
});

const editLineSchema = z.object({
  id: z.string().optional().nullable(),
  part_number: z.string().trim().min(1, { message: "Part number is required" }),
  description: z.string().trim().default(""),
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number" })
    .positive({ message: "Quantity must be greater than zero" }),
  uom: z.string().trim().min(1, { message: "Unit of measure is required" }),
  deadline: isoDate,
});

export const requirementEditSchema = z
  .object({
    id: z.string().min(1),
    ref: z.string().trim().min(1, { message: "Reference is required" }),
    customer: z.string().trim().min(1, { message: "Customer is required" }),
    submission_deadline: isoDate,
    status: z.enum(REQUIREMENT_STATUSES),
    notes: z.string().optional().default(""),
    loss_reason: z.enum(LOSS_REASONS).nullable().optional(),
    lines: z.array(editLineSchema).min(1, { message: "At least one line item is required" }),
  })
  .refine((v) => v.lines.every((line) => line.deadline >= v.submission_deadline), {
    message: "A line deadline cannot fall before the submission deadline",
    path: ["lines"],
  })
  .refine((v) => v.status !== "lost" || !!v.loss_reason, {
    message: "A lost requirement needs a reason",
    path: ["loss_reason"],
  });

export type RequirementEditInput = z.input<typeof requirementEditSchema>;

export const pdiSchema = z
  .object({
    order_id: z.string().min(1),
    part_number: z.string().trim().min(1, { message: "Part number is required" }),
    offered_qty: z.coerce.number().int().nonnegative(),
    cleared_qty: z.coerce.number().int().nonnegative(),
    rejected_qty: z.coerce.number().int().nonnegative(),
    inspection_type: z.enum(["physical", "vc", "third_party"]),
    inspection_date: isoDate,
    status: z.enum(["pending", "passed", "failed"]),
    dispatch_clearance: z.enum(["approved", "hold"]),
  })
  .refine((v) => v.cleared_qty + v.rejected_qty <= v.offered_qty, {
    message: "Cleared plus rejected cannot exceed the quantity offered",
    path: ["cleared_qty"],
  });

export const deliverySchema = z.object({
  order_id: z.string().min(1),
  quantity: z.coerce.number().int().positive({ message: "Quantity must be greater than zero" }),
  delivered_on: isoDate,
  delivery_ref: z.string().trim().min(1, { message: "Delivery reference is required" }),
  grn_number: z.string().trim().optional().default(""),
  status: z.enum(["in_transit", "delivered"]),
  acceptance: z.enum(["accepted", "rejected"]).nullable().default(null),
  closure_status: z.enum(["pending", "closed"]),
});

export const paymentSchema = z.object({
  oem_invoice_id: z.string().min(1),
  amount: z.coerce.number().positive({ message: "Amount must be greater than zero" }),
  paid_on: isoDate,
  mode: z.enum(["rtgs", "neft", "wire", "other"]).default("other"),
  payment_ref: z.string().trim().min(1, { message: "Payment reference is required" }),
});

// Empty string means "not declared" (null), not zero.
const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce
    .number()
    .int({ message: "Must be a whole number" })
    .nonnegative({ message: "Cannot be negative" })
    .nullable(),
);

export const oemUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, { message: "OEM name is required" }),
  approval_status: z.enum(["approved", "conditional", "not_approved"]),
  lead_time_days: z.coerce.number().int().nonnegative(),
  capabilities: z.string().optional().default(""),
  contact_name: z.string().optional().default(""),
  contact_email: z.string().optional().default(""),
  capacity_shared: z.enum(["true", "false"]).default("true"),
});

export const oemProductSchema = z.object({
  oem_id: z.string().min(1),
  part_number: z.string().trim().min(1, { message: "Part number is required" }),
  description: z.string().trim().optional().default(""),
  unit_price: z.coerce.number().nonnegative(),
  lead_time_days: z.coerce.number().int().nonnegative(),
  declared_capacity: optionalInt,
});

export const oemCapacitySchema = z.object({
  id: z.string().min(1),
  declared_capacity: optionalInt,
});

export interface FieldError {
  path: string;
  message: string;
}

export function firstErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
