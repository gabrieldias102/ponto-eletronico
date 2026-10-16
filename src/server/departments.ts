import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { DepartmentInput } from "@/lib/validation";
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";

export async function listDepartments() {
  return db.department.findMany({
    select: {
      id: true,
      name: true,
      manager: { select: { id: true, name: true } },
      _count: { select: { members: { where: { active: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getDepartment(id: string) {
  return db.department.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      managerId: true,
      members: {
        select: { id: true, name: true, role: true, active: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

/** Opções para o campo "setor" no cadastro de usuários. */
export async function departmentOptions() {
  return db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/** Usuários que podem ser gestores: perfil Gestor e ativos. */
export async function managerOptions() {
  return db.user.findMany({
    where: { role: "MANAGER", active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function assertValidManager(managerId: string | null) {
  if (!managerId) return;
  const manager = await db.user.findUnique({ where: { id: managerId }, select: { role: true, active: true } });
  if (!manager || manager.role !== "MANAGER" || !manager.active) {
    throw new DomainError("Selecione um usuário ativo com perfil Gestor.", "managerId");
  }
}

function isUniqueNameError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createDepartment(actor: CurrentUser, input: DepartmentInput) {
  await assertValidManager(input.managerId);
  try {
    return await db.$transaction(async (tx) => {
      const department = await tx.department.create({ data: input });
      await audit(
        { actorId: actor.id, action: "department.create", entity: "department", entityId: department.id, after: input },
        tx,
      );
      return department;
    });
  } catch (error) {
    if (isUniqueNameError(error)) throw new DomainError("Já existe um setor com este nome.", "name");
    throw error;
  }
}

export async function updateDepartment(actor: CurrentUser, id: string, input: DepartmentInput) {
  const current = await db.department.findUnique({ where: { id } });
  if (!current) throw new DomainError("Setor não encontrado.");
  await assertValidManager(input.managerId);

  try {
    return await db.$transaction(async (tx) => {
      const department = await tx.department.update({ where: { id }, data: input });
      await audit(
        {
          actorId: actor.id,
          action: "department.update",
          entity: "department",
          entityId: id,
          before: { name: current.name, managerId: current.managerId },
          after: input,
        },
        tx,
      );
      return department;
    });
  } catch (error) {
    if (isUniqueNameError(error)) throw new DomainError("Já existe um setor com este nome.", "name");
    throw error;
  }
}

export async function deleteDepartment(actor: CurrentUser, id: string) {
  const current = await db.department.findUnique({
    where: { id },
    select: { name: true, managerId: true, _count: { select: { members: true } } },
  });
  if (!current) throw new DomainError("Setor não encontrado.");
  if (current._count.members > 0) {
    throw new DomainError("Mova os funcionários para outro setor antes de excluir.");
  }

  await db.$transaction(async (tx) => {
    await tx.department.delete({ where: { id } });
    await audit(
      {
        actorId: actor.id,
        action: "department.delete",
        entity: "department",
        entityId: id,
        before: { name: current.name, managerId: current.managerId },
      },
      tx,
    );
  });
}
