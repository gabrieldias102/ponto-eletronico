"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { holidaySchema, scheduleSchema, toleranceSchema } from "@/lib/validation";
import { requirePermission } from "@/server/auth/session";
import { toActionState } from "@/server/errors";
import {
  createHoliday,
  createSchedule,
  deleteHoliday,
  deleteSchedule,
  duplicateSchedule,
  importNationalHolidays,
  updateSchedule,
  updateTolerance,
} from "@/server/schedules";

function parseDays(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(value ?? ""));
  } catch {
    return null;
  }
}

export async function saveSchedule(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  const parsed = scheduleSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    worksOnHolidays: formData.get("worksOnHolidays") === "on",
    cycleStartDate: formData.get("cycleStartDate") ?? "",
    days: parseDays(formData.get("days")),
  });
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error);
    // Erros dentro dos dias viram uma mensagem única do editor de horários.
    const daysError = Object.entries(fieldErrors).find(([k]) => k === "days" || k.startsWith("days."))?.[1];
    return { ok: false, fieldErrors: { ...fieldErrors, days: daysError ?? "" } };
  }

  try {
    if (id) {
      await updateSchedule(actor, id, parsed.data, formData.get("active") === "on");
    } else {
      await createSchedule(actor, parsed.data);
    }
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath("/jornadas");
  if (!id) redirect("/jornadas");
  return { ok: true, message: "Jornada salva." };
}

export async function duplicateScheduleAction(id: string): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  const copy = await duplicateSchedule(actor, id);
  revalidatePath("/jornadas");
  redirect(`/jornadas/${copy.id}`);
}

export async function deleteScheduleAction(id: string): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  try {
    await deleteSchedule(actor, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/jornadas");
  redirect("/jornadas");
}

export async function addHoliday(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  const parsed = holidaySchema.safeParse({
    date: formData.get("date"),
    name: formData.get("name"),
    scope: formData.get("scope"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    await createHoliday(actor, parsed.data);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/jornadas/feriados");
  return { ok: true, message: "Feriado adicionado." };
}

export async function removeHoliday(id: string): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  try {
    await deleteHoliday(actor, id);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/jornadas/feriados");
  return { ok: true, message: "Feriado excluído." };
}

export async function importHolidays(year: number, includeOptional: boolean): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, message: "Ano inválido." };
  const count = await importNationalHolidays(actor, year, includeOptional);
  revalidatePath("/jornadas/feriados");
  return {
    ok: true,
    message: count === 0 ? "Os feriados nacionais deste ano já estavam cadastrados." : `${count} feriado(s) importado(s).`,
  };
}

export async function saveTolerance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("schedules:manage");
  const parsed = toleranceSchema.safeParse({
    tolerancePerPunchMinutes: formData.get("tolerancePerPunchMinutes"),
    toleranceDailyMinutes: formData.get("toleranceDailyMinutes"),
    scheduleWarningMarginMinutes: formData.get("scheduleWarningMarginMinutes"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  await updateTolerance(actor, parsed.data);
  revalidatePath("/jornadas/tolerancia");
  return { ok: true, message: "Tolerância salva." };
}
