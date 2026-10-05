import { Info } from "lucide-react";
import Link from "next/link";

// Every data screen shows this. The dataset is mock and nothing is persisted.
export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-warning px-3 py-2 text-sm text-warning-foreground">
      <Info aria-hidden="true" className="size-4 shrink-0" />
      <span>
        <strong className="font-semibold">Seeded demo data.</strong> The seeded rows are marked as
        demo; records you create in the app are saved to the database. Orders, payments and
        reminders are Phase Two —{" "}
        <Link href="/roadmap" className="underline underline-offset-2">
          see what is here and what is not
        </Link>
        .
      </span>
    </div>
  );
}
