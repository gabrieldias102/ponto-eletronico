import { can, type Permission, type Role } from "@/lib/permissions";

export type NavIcon =
  | "home"
  | "clock"
  | "adjustments"
  | "approvals"
  | "team"
  | "users"
  | "departments"
  | "schedules"
  | "settings"
  | "audit";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Visível se o perfil tiver qualquer uma destas permissões (vazio = todos). */
  permissions?: Permission[];
  badge?: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: "home" },
  { href: "/ponto", label: "Registrar ponto", icon: "clock", permissions: ["punch:own"] },
  { href: "/ajustes", label: "Meus ajustes", icon: "adjustments", permissions: ["adjustment:request"] },
  {
    href: "/aprovacoes",
    label: "Aprovações",
    icon: "approvals",
    permissions: ["adjustment:review:manager", "adjustment:review:hr"],
  },
  { href: "/equipe", label: "Ponto da equipe", icon: "team", permissions: ["timesheet:team"] },
  { href: "/usuarios", label: "Usuários", icon: "users", permissions: ["users:manage"] },
  { href: "/setores", label: "Setores", icon: "departments", permissions: ["departments:manage"] },
  { href: "/jornadas", label: "Jornadas", icon: "schedules", permissions: ["schedules:manage"] },
  { href: "/configuracoes", label: "Configurações", icon: "settings", permissions: ["settings:manage"] },
  { href: "/auditoria", label: "Auditoria", icon: "audit", permissions: ["audit:view"] },
];

export function navItemsFor(role: Role, badges: Partial<Record<string, number>> = {}): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permissions || item.permissions.some((p) => can(role, p))).map((item) => ({
    ...item,
    badge: badges[item.href],
  }));
}
