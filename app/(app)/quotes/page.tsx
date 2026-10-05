import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { QuoteDraft } from "@/components/quote-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrderFromQuoteAction } from "@/lib/data/actions";
import {
  getOrderForQuote,
  getQuoteLines,
  getQuoteVersions,
  listLinesForRequirement,
  listQuotes,
  listRequirements,
} from "@/lib/data/db";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [quotes, requirements] = await Promise.all([listQuotes(), listRequirements()]);
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const rows = await Promise.all(
    quotes.map(async (quote) => {
      const [versions, requirementLines, order] = await Promise.all([
        getQuoteVersions(quote.id),
        listLinesForRequirement(quote.requirement_id),
        getOrderForQuote(quote.id),
      ]);
      const lines = versions[0] ? await getQuoteLines(versions[0].id) : [];
      return {
        quote,
        requirement: requirementById.get(quote.requirement_id),
        versions,
        lines,
        requirementLines,
        order,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Quotes</h1>
      <DemoBanner />

      {error && (
        <p className="rounded-md bg-danger px-3 py-2 text-xs text-danger-foreground">{error}</p>
      )}

      <p className="text-sm text-muted-foreground">
        The recommended price is generated in SQL and is advisory; the final price is a human
        field. An approved quote can be turned into an order below.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quotes in the database yet. Run{" "}
          <code>supabase/demo/005_seed_quotes_and_documents.sql</code>.
        </p>
      ) : (
        rows.map(({ quote, requirement, versions, lines, requirementLines, order }) => (
          <div key={quote.id} className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {requirement ? (
                <Link
                  href={`/requirements/${requirement.id}`}
                  className="text-primary hover:underline"
                >
                  {requirement.ref}
                </Link>
              ) : (
                quote.requirement_id
              )}{" "}
              · {requirement?.customer ?? ""}
            </p>
            <QuoteDraft
              quote={quote}
              versions={versions}
              lines={lines}
              requirementLines={requirementLines}
            />

            {quote.status === "approved" && !order && (
              <form
                action={createOrderFromQuoteAction}
                className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3"
              >
                <input type="hidden" name="quoteId" value={quote.id} />
                <div className="space-y-1">
                  <Label>PO number</Label>
                  <Input name="poNumber" required placeholder="PO-..." className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label>PO date</Label>
                  <Input name="poDate" type="date" required className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label>PO value</Label>
                  <Input name="poValue" type="number" min={0} step="0.01" required className="w-36" />
                </div>
                <Button type="submit">Create order</Button>
              </form>
            )}

            {order && (
              <p className="text-xs text-muted-foreground">
                Order{" "}
                <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                  {order.po_number ?? order.id}
                </Link>{" "}
                already exists for this quote.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
