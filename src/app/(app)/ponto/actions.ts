"use server";

import { revalidatePath } from "next/cache";
import { formatNsr } from "@/lib/punch-rules";
import { formatTime } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { registerPunch } from "@/server/time-entries";

export type PunchActionResult =
  | { status: "registered"; message: string }
  | { status: "needs-confirmation" }
  | { status: "error"; message: string };

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function punchAction(formData: FormData): Promise<PunchActionResult> {
  const user = await requirePermission("punch:own");
  const selfie = formData.get("selfie");

  try {
    const result = await registerPunch(user, {
      latitude: numberOrNull(formData.get("latitude")),
      longitude: numberOrNull(formData.get("longitude")),
      accuracyMeters: numberOrNull(formData.get("accuracy")),
      qrToken: (formData.get("qr") as string | null) || null,
      selfie: selfie instanceof File ? selfie : null,
      confirmOutsideHours: formData.get("confirmOutsideHours") === "1",
    });

    if (result.status === "needs-confirmation") return result;

    revalidatePath("/ponto");
    revalidatePath("/inicio");
    return {
      status: "registered",
      message: `Ponto registrado às ${formatTime(result.punchedAt)} · NSR ${formatNsr(result.nsr)}`,
    };
  } catch (error) {
    if (error instanceof DomainError) return { status: "error", message: error.message };
    throw error;
  }
}
