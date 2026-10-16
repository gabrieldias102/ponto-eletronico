import { can, type Permission, type Role } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "clock" | "team" | "users" | "departments" | "settings" | "audit";
  permission?: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: "home" },
  { href: "/ponto", label: "Registrar ponto", icon: "clock", permission: "punch:own" },
  { href: "/equipe", label: "Ponto da equipe", icon: "team", permission: "timesheet:team" },
  { href: "/usuarios", label: "Usuários", icon: "users", permission: "users:manage" },
  { href: "/setores", label: "Setores", icon: "departments", permission: "departments:manage" },
  { href: "/configuracoes", label: "Configurações", icon: "settings", permission: "settings:manage" },
  { href: "/auditoria", label: "Auditoria", icon: "audit", permission: "audit:view" },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(role, item.permission));
}
