import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { can } from "@/lib/permissions";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";

/**
 * Filtro dos funcionários cujo ponto `viewer` pode ver:
 * RH e Admin veem todos; o gestor vê os setores que gerencia. Admin não bate ponto, então fica de fora.
 * Retorna null se o usuário não pode ver o ponto de ninguém além do próprio.
 */
export function teamScope(viewer: CurrentUser): Prisma.UserWhereInput | null {
  const base: Prisma.UserWhereInput = { role: { not: "ADMIN" } };
  if (can(viewer.role, "timesheet:all")) return base;
  if (can(viewer.role, "timesheet:team")) {
    return { ...base, department: { managerId: viewer.id } };
  }
  return null;
}

/** Se `viewer` pode ver o ponto de `userId` (o próprio sempre pode). */
export async function canViewTimesheetOf(viewer: CurrentUser, userId: string): Promise<boolean> {
  if (viewer.id === userId) return true;
  const scope = teamScope(viewer);
  if (!scope) return false;
  return (await db.user.count({ where: { AND: [scope, { id: userId }] } })) > 0;
}
