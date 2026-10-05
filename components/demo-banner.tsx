import { Info } from "lucide-react";
import Link from "next/link";

// Every data screen shows this. The dataset is mock and nothing is persisted.
export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-warning px-3 py-2 text-sm text-warning-foreground">
      <Info aria-hidden="true" className="size-4 shrink-0" />
      <span>
        <strong className="font-semibold">Demo data.</strong> Records you create here are saved to
        the database: add a lead from a call, WhatsApp or referral, move it through stages, and see
        today&apos;s follow-ups.{" "}
        <Link href="/roadmap" className="underline underline-offset-2">
          What is here and what is pending
        </Link>
        .
      </span>
    </div>
  );
}
