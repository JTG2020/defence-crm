"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LOSS_REASON_LABEL,
  LOSS_REASONS,
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_STATUSES,
} from "@/lib/constants";
import { updateRequirementAction } from "@/lib/data/actions";
import type { Requirement, RequirementLine } from "@/lib/types";
import { requirementEditSchema, type RequirementEditInput } from "@/lib/validation";

export function RequirementEditForm({
  requirement,
  lines,
}: {
  requirement: Requirement;
  lines: RequirementLine[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RequirementEditInput>({
    resolver: zodResolver(requirementEditSchema),
    defaultValues: {
      id: requirement.id,
      ref: requirement.ref,
      customer: requirement.customer,
      submission_deadline: requirement.submission_deadline,
      status: requirement.status,
      notes: requirement.notes ?? "",
      loss_reason: requirement.loss_reason,
      lines: lines.map((line) => ({
        id: line.id,
        part_number: line.part_number,
        description: line.description,
        quantity: line.quantity,
        uom: line.uom,
        deadline: line.deadline,
      })),
    },
  });

  const { fields, append } = useFieldArray({ control, name: "lines" });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setGeneralError(null);
    const result = await updateRequirementAction(values);
    setSubmitting(false);

    if (result.ok) {
      router.push(`/requirements/${result.id}`);
      router.refresh();
      return;
    }
    for (const error of result.errors) {
      if (error.path) {
        setError(error.path as FieldPath<RequirementEditInput>, { message: error.message });
      } else {
        setGeneralError(error.message);
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" {...register("id")} />

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <Field label="Reference" error={errors.ref?.message}>
            <Input {...register("ref")} />
          </Field>
          <Field label="Customer" error={errors.customer?.message}>
            <Input {...register("customer")} />
          </Field>
          <Field label="Submission deadline" error={errors.submission_deadline?.message}>
            <Input type="date" {...register("submission_deadline")} />
          </Field>
          <Field label="Status">
            <Select {...register("status")}>
              {REQUIREMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REQUIREMENT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loss reason (only when lost)" error={errors.loss_reason?.message}>
            <Select
              {...register("loss_reason", { setValueAs: (v) => (v === "" ? null : v) })}
            >
              <option value="">—</option>
              {LOSS_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {LOSS_REASON_LABEL[reason]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea {...register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                id: null,
                part_number: "",
                description: "",
                quantity: 1,
                uom: "nos",
                deadline: requirement.submission_deadline,
              })
            }
          >
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-5"
            >
              <Field label="Part number" error={errors.lines?.[index]?.part_number?.message}>
                <Input {...register(`lines.${index}.part_number`)} />
              </Field>
              <Field label="Description">
                <Input {...register(`lines.${index}.description`)} />
              </Field>
              <Field label="Quantity" error={errors.lines?.[index]?.quantity?.message}>
                <Input type="number" min={1} {...register(`lines.${index}.quantity`)} />
              </Field>
              <Field label="UoM" error={errors.lines?.[index]?.uom?.message}>
                <Input {...register(`lines.${index}.uom`)} />
              </Field>
              <Field label="Deadline" error={errors.lines?.[index]?.deadline?.message}>
                <Input type="date" {...register(`lines.${index}.deadline`)} />
              </Field>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Existing lines are updated in place; new lines are appended. Removing a line is not
            supported yet, because commitments and quotes reference line ids.
          </p>
        </CardContent>
      </Card>

      {generalError && (
        <p className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          Not saved. {generalError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        <Link href={`/requirements/${requirement.id}`} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger-foreground">{error}</p>}
    </div>
  );
}
