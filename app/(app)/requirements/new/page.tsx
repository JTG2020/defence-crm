"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { DemoBanner } from "@/components/demo-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createRequirementAction } from "@/lib/data/actions";
import { REQUIREMENT_STATUSES, REQUIREMENT_STATUS_LABEL } from "@/lib/constants";
import { requirementSchema, type RequirementInput } from "@/lib/validation";

export default function NewRequirementPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RequirementInput>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      ref: "",
      customer: "",
      submission_deadline: "",
      status: "received",
      lines: [{ part_number: "", description: "", quantity: 1, uom: "nos", deadline: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setGeneralError(null);
    const result = await createRequirementAction(values);
    setSubmitting(false);

    if (result.ok) {
      router.push(`/requirements/${result.id}`);
      router.refresh();
      return;
    }
    for (const error of result.errors) {
      if (error.path) {
        setError(error.path as FieldPath<RequirementInput>, { message: error.message });
      } else {
        setGeneralError(error.message);
      }
    }
  });

  return (
    <div className="space-y-4">
      <DemoBanner />
      <h1 className="text-lg font-semibold">New requirement</h1>
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reference" error={errors.ref?.message}>
                <Input placeholder="REQ-2026-013" {...register("ref")} />
              </Field>
              <Field label="Customer" error={errors.customer?.message}>
                <Input placeholder="Customer A" {...register("customer")} />
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
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Line items</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      part_number: "",
                      description: "",
                      quantity: 1,
                      uom: "nos",
                      deadline: "",
                    })
                  }
                >
                  Add line
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-5"
                >
                  <Field label="Part number" error={errors.lines?.[index]?.part_number?.message}>
                    <Input placeholder="PN-0000" {...register(`lines.${index}.part_number`)} />
                  </Field>
                  <Field label="Description">
                    <Input placeholder="Description" {...register(`lines.${index}.description`)} />
                  </Field>
                  <Field label="Quantity" error={errors.lines?.[index]?.quantity?.message}>
                    <Input type="number" min={1} {...register(`lines.${index}.quantity`)} />
                  </Field>
                  <Field label="UoM" error={errors.lines?.[index]?.uom?.message}>
                    <Input placeholder="nos" {...register(`lines.${index}.uom`)} />
                  </Field>
                  <Field label="Delivery deadline" error={errors.lines?.[index]?.deadline?.message}>
                    <Input type="date" {...register(`lines.${index}.deadline`)} />
                  </Field>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {errors.lines?.message && (
                <p className="text-xs text-danger-foreground">{errors.lines.message}</p>
              )}
            </div>

            {generalError && (
              <p className="rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">
                Not saved. {generalError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save requirement"}
              </Button>
              <Link href="/requirements" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              A record missing a required field is refused here and again by the database, with
              nothing saved.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
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
