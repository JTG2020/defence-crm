import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DOCUMENT_TYPE_LABEL } from "@/lib/constants";
import { documentsWithStatus } from "@/lib/data/db";
import type { DocumentType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const allDocs = await documentsWithStatus();
  const docs =
    filter === "attention"
      ? allDocs.filter((d) => d.expiry_state === "expiring" || d.expiry_state === "expired")
      : allDocs;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Document vault</h1>
      <DemoBanner />

      <p className="text-sm text-muted-foreground">
        Compliance certificates and generated documents, with the expiry state the morning view
        uses. Uploading files and firing expiry reminders are not wired yet.
      </p>

      {filter === "attention" && (
        <p className="text-sm text-muted-foreground">
          Filtered to documents expiring or expired ·{" "}
          <Link href="/documents" className="text-primary hover:underline">
            clear
          </Link>
        </p>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents in the database yet. Run{" "}
          <code>supabase/demo/005_seed_quotes_and_documents.sql</code>.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Expiry state</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {DOCUMENT_TYPE_LABEL[d.type as DocumentType] ?? d.type}
                </TableCell>
                <TableCell>
                  {d.expiry_state === "none" ? (
                    <StatusBadge variant="neutral" label="No expiry" />
                  ) : d.expiry_state === "valid" ? (
                    <StatusBadge variant="success" label={`Valid · ${d.days_left}d left`} />
                  ) : d.expiry_state === "expiring" ? (
                    <StatusBadge variant="warning" label={`Expiring · ${d.days_left}d left`} />
                  ) : (
                    <StatusBadge
                      variant="danger"
                      label={`Expired · ${Math.abs(d.days_left ?? 0)}d ago`}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
