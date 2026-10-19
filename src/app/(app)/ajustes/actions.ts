"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { formatNsr } from "@/lib/punch-rules";
import { formatShortTime, parseDayKey } from "@/lib/time";
import { adjustmentSchema } from "@/lib/validation";
import { cancelAdjustment, createAdjustment, reviewAdjustment } from "@/server/adjustments";
import { requirePermission, requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { toActionState } from "@/server/errors";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function createAdjustmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("adjustment:request");
  const parsed = adjustmentSchema.safeParse({
    type: formData.get("type"),
    date: str(formData.get("date")),
    endDate: str(formData.get("endDate")) || str(formData.get("date")),
    time: str(formData.get("time")),
    timeEntryId: str(formData.get("timeEntryId")),
    partial: formData.get("partial") === "on",
    absenceStart: str(formData.get("absenceStart")),
    absenceEnd: str(formData.get("absenceEnd")),
    justification: str(formData.get("justification")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  const file = formData.get("attachment");
  let id: string;
  try {
    const request = await createAdjustment(
      user,
      parsed.data,
      file instanceof File && file.size > 0 ? file : null,
      str(formData.get("previousRequestId")) || null,
    );
    id = request.id;
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/ajustes");
  redirect(`/ajustes/${id}?enviado=1`);
}

/** Marcações do próprio usuário em um dia, para escolher qual corrigir. */
export async function myEntriesOn(date: string) {
  const user = await requirePermission("adjustment:request");
  const range = parseDayKey(date);
  if (!range) return [];
  const entries = await db.timeEntry.findMany({
    where: { userId: user.id, punchedAt: { gte: range.start, lt: range.end } },
    orderBy: { punchedAt: "asc" },
    select: { id: true, punchedAt: true, nsr: true },
  });
  return entries.map((e) => ({ id: e.id, label: `${formatShortTime(e.punchedAt)} · NSR ${formatNsr(e.nsr)}` }));
}

export async function cancelAdjustmentAction(id: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await cancelAdjustment(user, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/ajustes/${id}`);
  revalidatePath("/ajustes");
  return { ok: true, message: "Solicitação cancelada." };
}

export async function reviewAdjustmentAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const decision = formData.get("decision") === "APPROVED" ? "APPROVED" : "REJECTED";
  const comment = str(formData.get("comment")).trim().slice(0, 1000) || null;
  try {
    await reviewAdjustment(user, id, decision, comment);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/ajustes/${id}`);
  revalidatePath("/aprovacoes");
  return { ok: true, message: decision === "APPROVED" ? "Solicitação aprovada." : "Solicitação rejeitada." };
}
