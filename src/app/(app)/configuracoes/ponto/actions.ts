"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { allowedLocationSchema, punchSettingsSchema } from "@/lib/validation";
import { requirePermission } from "@/server/auth/session";
import { toActionState } from "@/server/errors";
import {
  createAllowedLocation,
  deleteAllowedLocation,
  rotateQrSecret,
  setAllowedLocationActive,
  updatePunchSettings,
} from "@/server/punch-settings";

const PATH = "/configuracoes/ponto";

export async function savePunchSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("settings:manage");
  const parsed = punchSettingsSchema.safeParse({
    punchRequireGeolocation: formData.get("punchRequireGeolocation") === "on",
    punchRequireGeofence: formData.get("punchRequireGeofence") === "on",
    punchRequireSelfie: formData.get("punchRequireSelfie") === "on",
    punchRequireQrCode: formData.get("punchRequireQrCode") === "on",
    businessHoursStart: formData.get("businessHoursStart"),
    businessHoursEnd: formData.get("businessHoursEnd"),
    businessDays: formData.getAll("businessDays").map(Number),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  await updatePunchSettings(actor, parsed.data);
  revalidatePath(PATH);
  return { ok: true, message: "Configurações de ponto salvas." };
}

export async function addLocation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("settings:manage");
  const parsed = allowedLocationSchema.safeParse({
    name: formData.get("name"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    radiusMeters: formData.get("radiusMeters"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  await createAllowedLocation(actor, parsed.data);
  revalidatePath(PATH);
  return { ok: true, message: "Local adicionado." };
}

export async function toggleLocation(id: string, active: boolean): Promise<ActionState> {
  const actor = await requirePermission("settings:manage");
  await setAllowedLocationActive(actor, id, active);
  revalidatePath(PATH);
  return { ok: true, message: active ? "Local ativado." : "Local desativado." };
}

export async function removeLocation(id: string): Promise<ActionState> {
  const actor = await requirePermission("settings:manage");
  try {
    await deleteAllowedLocation(actor, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(PATH);
  return { ok: true, message: "Local excluído." };
}

export async function rotateQr(): Promise<ActionState> {
  const actor = await requirePermission("settings:manage");
  await rotateQrSecret(actor);
  revalidatePath(PATH);
  return { ok: true, message: "Novo QR code gerado. Abra o novo link no painel." };
}
