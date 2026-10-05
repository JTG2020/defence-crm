"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LOSS_REASONS } from "@/lib/constants";
import { isISODateString } from "@/lib/dates";
import type { LossReason } from "@/lib/types";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  commitmentSchema,
  deliverySchema,
  firstErrors,
  oemCapacitySchema,
  oemProductSchema,
  oemUpdateSchema,
  paymentSchema,
  pdiSchema,
  requirementEditSchema,
  requirementSchema,
  type FieldError,
} from "@/lib/validation";

export type CreateRequirementResult =
  | { ok: true; id: string }
  | { ok: false; errors: FieldError[] };

// Validates at the edge (Zod), then writes through one SQL function so the header and its
// lines save together or not at all. The database enforces the same rules again, so an
// invalid record cannot be written even if this check is bypassed.
export async function createRequirementAction(input: unknown): Promise<CreateRequirementResult> {
  const parsed = requirementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error) };
  }

  const data = parsed.data;
  const supabase = await createServerSupabase();
  const { data: id, error } = await supabase.rpc("create_requirement_with_lines", {
    p_ref: data.ref,
    p_customer: data.customer,
    p_status: data.status,
    p_submission_deadline: data.submission_deadline,
    p_lines: data.lines.map((line) => ({
      part_number: line.part_number,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      deadline: line.deadline,
    })),
  });

  if (error) {
    return { ok: false, errors: [{ path: "", message: error.message }] };
  }

  revalidatePath("/requirements");
  revalidatePath("/");
  return { ok: true, id: id as string };
}

// Edit a requirement header and its lines. The SQL function updates existing lines and appends
// new ones in one transaction; the database enforces the same rules again.
export async function updateRequirementAction(input: unknown): Promise<CreateRequirementResult> {
  const parsed = requirementEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error) };
  }

  const data = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("update_requirement_with_lines", {
    p_id: data.id,
    p_ref: data.ref,
    p_customer: data.customer,
    p_status: data.status,
    p_submission_deadline: data.submission_deadline,
    p_loss_reason: data.loss_reason ?? null,
    p_notes: data.notes ? data.notes : null,
    p_lines: data.lines.map((line) => ({
      id: line.id ?? null,
      part_number: line.part_number,
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      deadline: line.deadline,
    })),
  });

  if (error) {
    return { ok: false, errors: [{ path: "", message: error.message }] };
  }

  revalidatePath(`/requirements/${data.id}`);
  revalidatePath("/requirements");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

// Edit an OEM's master record.
export async function updateOemAction(formData: FormData) {
  const oemId = String(formData.get("id") ?? "");
  const parsed = oemUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid OEM";
    redirect(`/oems/${oemId}?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const capabilities = (data.capabilities ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("oems")
    .update({
      name: data.name,
      approval_status: data.approval_status,
      lead_time_days: data.lead_time_days,
      capabilities,
      contact_name: data.contact_name ? data.contact_name : null,
      contact_email: data.contact_email ? data.contact_email : null,
      capacity_shared: data.capacity_shared === "true",
    })
    .eq("id", data.id);
  if (error) {
    redirect(`/oems/${data.id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/oems/${data.id}`);
  revalidatePath("/oems");
  redirect(`/oems/${data.id}`);
}

export async function addOemProductAction(formData: FormData) {
  const oemId = String(formData.get("oem_id") ?? "");
  const parsed = oemProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid product";
    redirect(`/oems/${oemId}?error=${encodeURIComponent(message)}`);
  }

  const p = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("oem_products").insert({
    oem_id: p.oem_id,
    part_number: p.part_number,
    description: p.description,
    unit_price: p.unit_price,
    lead_time_days: p.lead_time_days,
    declared_capacity: p.declared_capacity,
    is_demo: false,
  });
  if (error) {
    redirect(`/oems/${p.oem_id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/oems/${p.oem_id}`);
  redirect(`/oems/${p.oem_id}`);
}

// Set (or clear) an OEM product's declared capacity — the A1 input.
export async function setOemProductCapacityAction(formData: FormData) {
  const oemId = String(formData.get("oem_id") ?? "");
  const parsed = oemCapacitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid capacity";
    redirect(`/oems/${oemId}?error=${encodeURIComponent(message)}`);
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("oem_products")
    .update({ declared_capacity: parsed.data.declared_capacity })
    .eq("id", parsed.data.id);
  if (error) {
    redirect(`/oems/${oemId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/oems/${oemId}`);
  redirect(`/oems/${oemId}`);
}

// Record a firm or indicative OEM commitment. Coverage is a view over these rows, so the
// uncovered balance on the requirement updates the moment this saves.
export async function recordCommitmentAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const parsed = commitmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid commitment";
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(message)}`);
  }

  const c = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("add_commitment", {
    p_requirement_line_id: c.requirement_line_id,
    p_oem_id: c.oem_id,
    p_kind: c.kind,
    p_quantity: c.quantity,
    p_unit_price: c.unit_price,
    p_expected_date: c.expected_date,
  });
  if (error) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath("/");
  redirect(`/requirements/${requirementId}`);
}

// Create a draft quote from a requirement.
export async function createQuoteAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const marginRaw = String(formData.get("margin") ?? "15");
  const margin = Number(marginRaw);
  if (!requirementId || !Number.isFinite(margin) || margin < 0) {
    redirect("/requirements?error=" + encodeURIComponent("A valid margin is required"));
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("create_quote_for_requirement", {
    p_requirement_id: requirementId,
    p_margin_pct: margin,
  });
  if (error) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/quotes");
  revalidatePath(`/requirements/${requirementId}`);
  redirect("/quotes");
}

export async function approveQuoteAction(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("approve_quote", { p_quote_id: quoteId });
  if (error) {
    redirect("/quotes?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/quotes");
  redirect("/quotes");
}

export async function setQuoteLinePriceAction(formData: FormData) {
  const lineId = String(formData.get("line_id") ?? "");
  const priceRaw = String(formData.get("final_price") ?? "");
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (!lineId || (price !== null && (!Number.isFinite(price) || price < 0))) {
    redirect("/quotes?error=" + encodeURIComponent("Final price must be zero or greater"));
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("quote_version_lines")
    .update({ final_price: price })
    .eq("id", lineId);
  if (error) {
    redirect("/quotes?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/quotes");
  redirect("/quotes");
}

// Send an OEM request for a line (idempotent: a second request for the same OEM is ignored).
export async function sendOemRequestAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const lineId = String(formData.get("requirement_line_id") ?? "");
  const oemId = String(formData.get("oem_id") ?? "");
  if (!lineId || !oemId) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent("Choose an OEM to request")}`);
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("oem_requests").upsert(
    { requirement_line_id: lineId, oem_id: oemId, requested_at: new Date().toISOString(), is_demo: false },
    { onConflict: "requirement_line_id,oem_id", ignoreDuplicates: true },
  );
  if (error) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath("/");
  redirect(`/requirements/${requirementId}`);
}

// Convert an approved quote to an order. Only an approved quote can become an order; the SQL
// function enforces it in the database as well as here.
export async function createOrderFromQuoteAction(formData: FormData) {
  const quoteId = String(formData.get("quoteId") ?? "");
  const poNumber = String(formData.get("poNumber") ?? "").trim();
  const poDate = String(formData.get("poDate") ?? "");
  const poValueRaw = String(formData.get("poValue") ?? "");
  const poValue = poValueRaw === "" ? Number.NaN : Number(poValueRaw);

  if (!quoteId || !poNumber || !isISODateString(poDate) || !Number.isFinite(poValue) || poValue < 0) {
    redirect(
      "/quotes?error=" +
        encodeURIComponent("PO number, a valid PO date and a PO value are required"),
    );
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_order_from_quote", {
    p_quote_id: quoteId,
    p_po_number: poNumber,
    p_po_date: poDate,
    p_po_value: poValue,
  });
  if (error) {
    redirect("/quotes?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/orders");
  revalidatePath("/quotes");
  revalidatePath("/");
  redirect(`/orders/${data as string}`);
}

export async function recordPdiAction(formData: FormData) {
  const parsed = pdiSchema.safeParse(Object.fromEntries(formData));
  const orderId = String(formData.get("order_id") ?? "");
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid inspection record";
    redirect(`/orders/${orderId}?error=${encodeURIComponent(message)}`);
  }

  const p = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("pdi_records").insert({
    order_id: p.order_id,
    part_number: p.part_number,
    offered_qty: p.offered_qty,
    cleared_qty: p.cleared_qty,
    rejected_qty: p.rejected_qty,
    inspection_type: p.inspection_type,
    inspection_date: p.inspection_date,
    status: p.status,
    dispatch_clearance: p.dispatch_clearance,
    held: false,
    is_demo: false,
  });
  if (error) {
    redirect(`/orders/${p.order_id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/orders/${p.order_id}`);
  revalidatePath("/");
  redirect(`/orders/${p.order_id}`);
}

export async function recordDeliveryAction(formData: FormData) {
  const acceptanceRaw = String(formData.get("acceptance") ?? "");
  const parsed = deliverySchema.safeParse({
    order_id: formData.get("order_id"),
    quantity: formData.get("quantity"),
    delivered_on: formData.get("delivered_on"),
    delivery_ref: formData.get("delivery_ref"),
    grn_number: formData.get("grn_number") ?? "",
    status: formData.get("status"),
    acceptance: acceptanceRaw === "" ? null : acceptanceRaw,
    closure_status: formData.get("closure_status"),
  });
  const orderId = String(formData.get("order_id") ?? "");
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid delivery record";
    redirect(`/orders/${orderId}?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("deliveries").insert({
    order_id: d.order_id,
    quantity: d.quantity,
    delivered_on: d.delivered_on,
    delivery_ref: d.delivery_ref,
    grn_number: d.grn_number ?? "",
    status: d.status,
    acceptance: d.acceptance,
    closure_status: d.closure_status,
    is_demo: false,
  });
  if (error) {
    redirect(`/orders/${d.order_id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/orders/${d.order_id}`);
  revalidatePath("/");
  redirect(`/orders/${d.order_id}`);
}

// Record a (possibly partial) payment against an OEM invoice.
export async function recordPaymentAction(formData: FormData) {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = firstErrors(parsed.error)[0]?.message ?? "Invalid payment";
    redirect(`/payments?error=${encodeURIComponent(message)}`);
  }

  const p = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("payments").insert({
    oem_invoice_id: p.oem_invoice_id,
    amount: p.amount,
    paid_on: p.paid_on,
    mode: p.mode,
    payment_ref: p.payment_ref,
    kind: "oem_payment",
    is_demo: false,
  });
  if (error) {
    redirect(`/payments?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/payments");
  revalidatePath("/");
  redirect("/payments");
}

// Raise a commission invoice. The database refuses it before an OEM-payment milestone exists.
export async function raiseCommissionAction(formData: FormData) {
  const oemInvoiceId = String(formData.get("oem_invoice_id") ?? "");
  const commissionNo = String(formData.get("commission_no") ?? "").trim();
  const pctRaw = String(formData.get("commission_pct") ?? "");
  const invoiceDate = String(formData.get("invoice_date") ?? "");
  const pct = Number(pctRaw);

  if (
    !oemInvoiceId ||
    !commissionNo ||
    !Number.isFinite(pct) ||
    pct < 0 ||
    !isISODateString(invoiceDate)
  ) {
    redirect(
      "/payments?error=" +
        encodeURIComponent("A commission number, a valid percentage and date are required"),
    );
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("raise_commission_invoice", {
    p_oem_invoice_id: oemInvoiceId,
    p_commission_no: commissionNo,
    p_commission_pct: pct,
    p_invoice_date: invoiceDate,
  });
  if (error) {
    redirect("/payments?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/payments");
  redirect("/payments");
}

// Generate the follow-up tasks from stale records. Idempotent: re-running adds no duplicates.
export async function runRemindersAction() {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("generate_followup_tasks");
  if (error) {
    redirect("/tasks?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/tasks");
  revalidatePath("/");
  redirect("/tasks");
}

export async function completeTaskAction(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) {
    redirect("/tasks?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/tasks");
  revalidatePath("/");
  redirect("/tasks");
}

// Record a structured loss. Status and reason are set together; the DB check constraint requires
// a reason whenever the status is lost, so an unexplained loss cannot be saved.
export async function recordLossAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const reason = String(formData.get("loss_reason") ?? "");
  if (!requirementId || !LOSS_REASONS.includes(reason as LossReason)) {
    redirect(
      `/requirements/${requirementId}?error=${encodeURIComponent("Choose a loss reason from the list")}`,
    );
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("requirements")
    .update({ status: "lost", loss_reason: reason })
    .eq("id", requirementId);
  if (error) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath("/requirements");
  revalidatePath("/");
  redirect(`/requirements/${requirementId}`);
}
