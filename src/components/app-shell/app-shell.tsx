"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2Icon,
  CalendarClockIcon,
  ClockIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { PontualLogo } from "@/components/brand/pontual-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

const ICONS = {
  home: HomeIcon,
  clock: ClockIcon,
  team: UsersRoundIcon,
  users: UsersIcon,
  departments: Building2Icon,
  schedules: CalendarClockIcon,
  settings: SettingsIcon,
  audit: ScrollTextIcon,
} as const;

type Props = {
  items: NavItem[];
  user: { name: string; roleLabel: string };
  organization: { name: string; logoUrl: string | null };
  children: React.ReactNode;
};

function OrganizationBadge({ organization }: Pick<Props, "organization">) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {organization.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo enviado pela organização, de origem variável
        <img src={organization.logoUrl} alt="" className="h-8 w-auto max-w-24 object-contain" />
      ) : null}
      <span className="truncate font-medium">{organization.name}</span>
    </div>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ user }: Pick<Props, "user">) {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair" title="Sair">
        <LogOutIcon />
      </Button>
    </div>
  );
}

export function AppShell({ items, user, organization, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-svh">
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <OrganizationBadge organization={organization} />
        <div className="flex-1">
          <NavLinks items={items} />
        </div>
        <UserFooter user={user} />
        <PontualLogo className="justify-center text-muted-foreground [&_svg]:size-5 [&>span]:text-sm" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho (celular) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background px-4 md:hidden">
          <OrganizationBadge organization={organization} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col gap-6 p-4">
              <SheetTitle>
                <OrganizationBadge organization={organization} />
              </SheetTitle>
              <div className="flex-1">
                <NavLinks items={items} onNavigate={() => setOpen(false)} />
              </div>
              <UserFooter user={user} />
              <PontualLogo className="justify-center text-muted-foreground [&_svg]:size-5 [&>span]:text-sm" />
            </SheetContent>
          </Sheet>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
