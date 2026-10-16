"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Abas de navegação entre sub-rotas. A aba é ativa no caminho exato ou em sub-rotas que não sejam de outra aba. */
export function PageTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const active =
    [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
      ?.href ?? null;

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={active === tab.href ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === tab.href
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
