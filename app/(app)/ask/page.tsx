import { HelpCircle, Search } from "lucide-react";
import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EXAMPLE_QUESTIONS, ask } from "@/lib/ask/ask";
import { buildAskRepository } from "@/lib/data/ask-repository";

export const dynamic = "force-dynamic";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const question = (q ?? "").trim();
  const result = question ? ask(question, await buildAskRepository()) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Ask</h1>
        <p className="text-sm text-muted-foreground">
          Questions answered from the stored records, with the definition of how each was counted.
          No AI: the same question always gives the same answer, and when it cannot answer it says
          so rather than guessing.
        </p>
      </div>

      <DemoBanner />

      <form method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={question}
          placeholder="How many requirements are open?"
          className="max-w-md flex-1"
          aria-label="Your question"
        />
        <Button type="submit">
          <Search aria-hidden="true" />
          Ask
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((example) => (
          <Link
            key={example}
            href={`/ask?q=${encodeURIComponent(example)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {example}
          </Link>
        ))}
      </div>

      {result?.kind === "answer" && (
        <Card>
          <CardHeader>
            <CardTitle>{result.answer}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">How counted:</span>{" "}
              {result.howCounted}
            </p>
            {result.records && result.records.length > 0 && (
              <ul className="divide-y divide-border rounded-md border border-border">
                {result.records.map((record, index) => (
                  <li key={`${record.label}-${index}`}>
                    <Link
                      href={record.href}
                      className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{record.label}</span>
                      <span className="text-muted-foreground">{record.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {result?.kind === "unknown" && (
        <Card className="border-warning bg-warning text-warning-foreground">
          <CardHeader className="flex-row items-center gap-2">
            <HelpCircle aria-hidden="true" className="size-5" />
            <CardTitle>No answer from the stored data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{result.message}</CardContent>
        </Card>
      )}
    </div>
  );
}
