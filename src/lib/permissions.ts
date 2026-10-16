/**
 * Perfis e permissões. Fonte única da matriz descrita em docs/requisitos.md (seção 2.1).
 * Usado no servidor para autorizar e no cliente apenas para esconder o que não se aplica.
 */

export const ROLES = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  HR: "RH",
  MANAGER: "Gestor",
  EMPLOYEE: "Usuário",
};

export type Permission =
  | "punch:own"
  | "timesheet:own"
  | "adjustment:request"
  | "timesheet:team"
  | "timesheet:all"
  | "adjustment:review:manager"
  | "adjustment:review:hr"
  | "users:manage"
  | "departments:manage"
  | "schedules:manage"
  | "settings:manage"
  | "reports:view"
  | "audit:view"
  | "dashboard:view";

const EMPLOYEE_PERMISSIONS: Permission[] = ["punch:own", "timesheet:own", "adjustment:request"];

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "timesheet:team",
    "timesheet:all",
    "adjustment:review:manager",
    "adjustment:review:hr",
    "users:manage",
    "departments:manage",
    "schedules:manage",
    "settings:manage",
    "reports:view",
    "audit:view",
    "dashboard:view",
  ],
  HR: [
    ...EMPLOYEE_PERMISSIONS,
    "timesheet:team",
    "timesheet:all",
    "adjustment:review:hr",
    "users:manage",
    "dashboard:view",
  ],
  MANAGER: [
    ...EMPLOYEE_PERMISSIONS,
    "timesheet:team",
    "adjustment:review:manager",
    "dashboard:view",
  ],
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

/** Perfis que `actor` pode atribuir ao cadastrar ou editar um usuário. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "ADMIN") return [...ROLES];
  if (actor === "HR") return ["HR", "MANAGER", "EMPLOYEE"];
  return [];
}

/** Se `actor` pode editar um usuário que hoje tem o perfil `target`. */
export function canManageUser(actor: Role, target: Role): boolean {
  return assignableRoles(actor).includes(target);
}

/** O Administrador é externo à operação e não bate ponto, logo não pertence a um setor. */
export function requiresDepartment(role: Role): boolean {
  return role !== "ADMIN";
}
