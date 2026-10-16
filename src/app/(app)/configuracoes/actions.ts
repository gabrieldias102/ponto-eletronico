"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { organizationSchema } from "@/lib/validation";
import { requirePermission } from "@/server/auth/session";
import { toActionState } from "@/server/errors";
import { updateOrganization } from "@/server/organization";

export async function saveOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("settings:manage");

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") ?? "",
    taxId: formData.get("taxId") ?? "",
    primaryColor: formData.get("primaryColor"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  const file = formData.get("logo");
  const logo =
    file instanceof File && file.size > 0
      ? { file }
      : formData.get("removeLogo") === "on"
        ? ({ remove: true } as const)
        : null;

  try {
    await updateOrganization(actor, parsed.data, logo);
  } catch (error) {
    return toActionState(error);
  }

  // A identidade visual aparece em todas as telas.
  revalidatePath("/", "layout");
  return { ok: true, message: "Configurações salvas." };
}
