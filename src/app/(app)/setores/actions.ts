"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { departmentSchema } from "@/lib/validation";
import { requirePermission } from "@/server/auth/session";
import { createDepartment, deleteDepartment, updateDepartment } from "@/server/departments";
import { toActionState } from "@/server/errors";

export async function saveDepartment(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("departments:manage");

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    managerId: formData.get("managerId") ?? "",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    if (id) await updateDepartment(actor, id, parsed.data);
    else await createDepartment(actor, parsed.data);
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath("/setores");
  if (!id) redirect("/setores");
  return { ok: true, message: "Setor atualizado." };
}

export async function deleteDepartmentAction(id: string): Promise<ActionState> {
  const actor = await requirePermission("departments:manage");
  try {
    await deleteDepartment(actor, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/setores");
  redirect("/setores");
}
