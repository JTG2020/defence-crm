"use client";

import {
  Activity,
  Banknote,
  Bell,
  Database,
  FileText,
  History,
  LayoutDashboard,
  Map,
  MessagesSquare,
  Palette,
  Factory,
  ReceiptIndianRupee,
  ClipboardList,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/supabase/actions";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/requirements", label: "Requirements", icon: ClipboardList },
  { href: "/oems", label: "OEMs", icon: Factory },
  { href: "/history", label: "History", icon: History },
  { href: "/quotes", label: "Quotes", icon: ReceiptIndianRupee },
  { href: "/orders", label: "Orders", icon: Truck },
  { href: "/payments", label: "Payments", icon: Banknote },
  { href: "/tasks", label: "Follow-ups", icon: Bell },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/ask", label: "Ask", icon: MessagesSquare },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/data", label: "Data check", icon: Database },
  { href: "/style", label: "Style guide", icon: Palette },
];

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-3 md:flex">
        <div className="px-2 py-3">
          <div className="text-sm font-semibold leading-tight">Defence contract CRM</div>
        </div>
        <nav className="mt-2 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  active
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-2 py-2">
          <Badge variant="warning">Demo build</Badge>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold md:hidden">Defence contract CRM</span>
          </div>
          <div className="flex items-center gap-2">
            {userEmail ? (
              <>
                <span className="hidden text-xs text-muted-foreground sm:inline">{userEmail}</span>
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <Badge variant="warning">Not signed in</Badge>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
