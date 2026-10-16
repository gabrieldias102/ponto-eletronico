"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { canManageUser, requiresDepartment } from "@/lib/permissions";
import { userPunchOverridesSchema, userSchema } from "@/lib/validation";
import { requirePermission } from "@/server/auth/session";
import { toActionState } from "@/server/errors";
import { assignSchedule, removeAssignment } from "@/server/schedules";
import { createUser, getUser, resendInvite, updateUser } from "@/server/users";

export async function saveUser(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("users:manage");

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId") ?? "",
    active: id ? formData.get("active") === "on" : true,
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  // Exceções das validações de ponto. O Administrador não bate ponto: sempre segue o padrão.
  const field = (name: string) => (requiresDepartment(parsed.data.role) ? formData.get(name) ?? undefined : undefined);
  const overrides = userPunchOverridesSchema.safeParse({
    punchRequireGeolocation: field("punchRequireGeolocation"),
    punchRequireGeofence: field("punchRequireGeofence"),
    punchRequireSelfie: field("punchRequireSelfie"),
    punchRequireQrCode: field("punchRequireQrCode"),
  });
  if (!overrides.success) return { ok: false, fieldErrors: fieldErrorsFrom(overrides.error) };
  const data = { ...parsed.data, ...overrides.data };

  try {
    if (id) {
      await updateUser(actor, id, data);
    } else {
      await createUser(actor, data);
    }
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath("/usuarios");
  if (!id) redirect("/usuarios?criado=1");
  return { ok: true, message: "Alterações salvas." };
}

export async function resendInviteAction(id: string): Promise<ActionState> {
  const actor = await requirePermission("users:manage");
  try {
    await resendInvite(actor, id);
  } catch (error) {
    return toActionState(error);
  }
  return { ok: true, message: "Convite reenviado." };
}

export async function assignScheduleAction(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("users:manage");
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  if (!scheduleId) return { ok: false, fieldErrors: { scheduleId: "Selecione a jornada." } };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, fieldErrors: { startDate: "Informe a data." } };

  const target = await getUser(userId);
  if (!target || !canManageUser(actor.role, target.role) || !requiresDepartment(target.role)) {
    return { ok: false, message: "Não é possível atribuir jornada a este usuário." };
  }
  try {
    await assignSchedule(actor, userId, scheduleId, startDate);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/usuarios/${userId}`);
  return { ok: true, message: "Jornada atribuída." };
}

export async function removeAssignmentAction(userId: string, assignmentId: string): Promise<ActionState> {
  const actor = await requirePermission("users:manage");
  const target = await getUser(userId);
  if (!target || !canManageUser(actor.role, target.role)) {
    return { ok: false, message: "Não é possível alterar este usuário." };
  }
  try {
    await removeAssignment(actor, userId, assignmentId);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/usuarios/${userId}`);
  return { ok: true, message: "Atribuição removida." };
}
