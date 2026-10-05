import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
