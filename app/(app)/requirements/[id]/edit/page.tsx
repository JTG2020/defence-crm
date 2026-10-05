import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { RequirementEditForm } from "@/components/requirement-edit-form";
import { getRequirement, listLinesForRequirement } from "@/lib/data/db";

export const dynamic = "force-dynamic";

export default async function EditRequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requirement = await getRequirement(id);
  if (!requirement) notFound();
  const lines = await listLinesForRequirement(id);

  return (
    <div className="space-y-4">
      <DemoBanner />
      <h1 className="text-lg font-semibold">Edit {requirement.ref}</h1>
      <RequirementEditForm requirement={requirement} lines={lines} />
    </div>
  );
}
