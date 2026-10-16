import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { assignableRoles, canManageUser, type Role } from "@/lib/permissions";
import type { UserInput, UserPunchOverrides } from "@/lib/validation";

export type UserData = UserInput & UserPunchOverrides;
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { sendInvite } from "@/server/invites";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  punchRequireGeolocation: true,
  punchRequireGeofence: true,
  punchRequireSelfie: true,
  punchRequireQrCode: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(search?: string) {
  const q = search?.trim();
  return db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: { ...userSelect, accounts: { select: { id: true }, where: { providerId: "credential" } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getUser(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      ...userSelect,
      accounts: { select: { id: true }, where: { providerId: "credential" } },
      managedDepartments: { select: { id: true, name: true } },
    },
  });
}

function assertCanAssign(actor: CurrentUser, role: Role) {
  if (!assignableRoles(actor.role).includes(role)) {
    throw new DomainError("Você não pode atribuir este perfil.", "role");
  }
}

async function assertDepartmentExists(departmentId: string | null) {
  if (!departmentId) return;
  const exists = await db.department.count({ where: { id: departmentId } });
  if (!exists) throw new DomainError("Setor não encontrado.", "departmentId");
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createUser(actor: CurrentUser, input: UserData) {
  assertCanAssign(actor, input.role);
  await assertDepartmentExists(input.departmentId);

  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({ data: input, select: userSelect });
      await audit(
        { actorId: actor.id, action: "user.create", entity: "user", entityId: created.id, after: input },
        tx,
      );
      return created;
    });

    if (user.active) await sendInvite(user);
    return user;
  } catch (error) {
    if (isUniqueEmailError(error)) throw new DomainError("Já existe um usuário com este e-mail.", "email");
    throw error;
  }
}

export async function updateUser(actor: CurrentUser, id: string, input: UserData) {
  const current = await getUser(id);
  if (!current) throw new DomainError("Usuário não encontrado.");
  if (!canManageUser(actor.role, current.role)) throw new DomainError("Você não pode editar este usuário.");
  assertCanAssign(actor, input.role);
  await assertDepartmentExists(input.departmentId);

  if (current.id === actor.id && (input.role !== current.role || !input.active)) {
    throw new DomainError("Você não pode alterar o próprio perfil nem se desativar.");
  }

  const managed = current.managedDepartments;
  if (managed.length > 0 && (input.role !== "MANAGER" || !input.active)) {
    throw new DomainError(
      `Este usuário é gestor de: ${managed.map((d) => d.name).join(", ")}. Troque o gestor do setor antes.`,
      "role",
    );
  }

  const before = {
    name: current.name,
    email: current.email,
    role: current.role,
    departmentId: current.departmentId,
    active: current.active,
    punchRequireGeolocation: current.punchRequireGeolocation,
    punchRequireGeofence: current.punchRequireGeofence,
    punchRequireSelfie: current.punchRequireSelfie,
    punchRequireQrCode: current.punchRequireQrCode,
  };

  try {
    return await db.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: input, select: userSelect });
      // Desativar encerra as sessões abertas.
      if (current.active && !input.active) await tx.session.deleteMany({ where: { userId: id } });
      await audit(
        { actorId: actor.id, action: "user.update", entity: "user", entityId: id, before, after: input },
        tx,
      );
      return updated;
    });
  } catch (error) {
    if (isUniqueEmailError(error)) throw new DomainError("Já existe um usuário com este e-mail.", "email");
    throw error;
  }
}

export async function resendInvite(actor: CurrentUser, id: string) {
  const user = await getUser(id);
  if (!user) throw new DomainError("Usuário não encontrado.");
  if (!canManageUser(actor.role, user.role)) throw new DomainError("Você não pode editar este usuário.");
  if (!user.active) throw new DomainError("Ative o usuário antes de reenviar o convite.");

  await sendInvite(user);
  await audit({ actorId: actor.id, action: "user.invite", entity: "user", entityId: id });
}
