import "server-only";
import { Prisma, type WorkSchedule } from "@/generated/prisma/client";
import { nationalHolidays } from "@/lib/holidays";
import {
  addDays,
  assignmentForDay,
  periodsForDay,
  toIntervals,
  type CycleDays,
  type Period,
  type ScheduleDefinition,
  type WeeklyDays,
} from "@/lib/schedule";
import { dateKey } from "@/lib/time";
import type { HolidayInput, ScheduleInput, ToleranceInput } from "@/lib/validation";
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { getOrganization, ORGANIZATION_ID } from "@/server/organization";

export function toDefinition(s: Pick<WorkSchedule, "type" | "days" | "cycleStartDate" | "worksOnHolidays">): ScheduleDefinition {
  return s.type === "WEEKLY"
    ? { type: "WEEKLY", days: s.days as WeeklyDays, worksOnHolidays: s.worksOnHolidays }
    : { type: "CYCLE", days: s.days as CycleDays, cycleStartDate: s.cycleStartDate!, worksOnHolidays: s.worksOnHolidays };
}

function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// ---------------------------------------------------------------------------
// Jornadas
// ---------------------------------------------------------------------------

export async function listSchedules() {
  const today = dateKey(new Date());
  const schedules = await db.workSchedule.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { assignments: { select: { userId: true, startDate: true } } },
  });
  // Quantos funcionários estão com a jornada vigente hoje.
  const allAssignments = await db.scheduleAssignment.findMany({
    where: { user: { active: true } },
    select: { userId: true, scheduleId: true, startDate: true },
  });
  const byUser = new Map<string, typeof allAssignments>();
  for (const a of allAssignments) byUser.set(a.userId, [...(byUser.get(a.userId) ?? []), a]);
  const currentCount = new Map<string, number>();
  for (const list of byUser.values()) {
    const current = assignmentForDay(list, today);
    if (current) currentCount.set(current.scheduleId, (currentCount.get(current.scheduleId) ?? 0) + 1);
  }
  return schedules.map((s) => ({
    ...s,
    inUse: s.assignments.length > 0,
    currentEmployees: currentCount.get(s.id) ?? 0,
  }));
}

export async function getSchedule(id: string) {
  const schedule = await db.workSchedule.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  return schedule ? { ...schedule, inUse: schedule._count.assignments > 0 } : null;
}

export async function scheduleOptions() {
  return db.workSchedule.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

function scheduleData(input: ScheduleInput) {
  return {
    name: input.name,
    description: input.description,
    type: input.type,
    days: input.days as Prisma.InputJsonValue,
    cycleStartDate: input.type === "CYCLE" ? input.cycleStartDate : null,
    worksOnHolidays: input.worksOnHolidays,
  };
}

export async function createSchedule(actor: CurrentUser, input: ScheduleInput) {
  try {
    return await db.$transaction(async (tx) => {
      const schedule = await tx.workSchedule.create({ data: scheduleData(input) });
      await audit(
        { actorId: actor.id, action: "schedule.create", entity: "work_schedule", entityId: schedule.id, after: scheduleData(input) },
        tx,
      );
      return schedule;
    });
  } catch (error) {
    if (isUniqueError(error)) throw new DomainError("Já existe uma jornada com este nome.", "name");
    throw error;
  }
}

/**
 * Jornada já atribuída não pode ter os períodos alterados: mudaria a carga prevista de dias passados.
 * Nesse caso só nome, descrição e status mudam; para mudar horários, duplique e atribua a nova.
 */
export async function updateSchedule(actor: CurrentUser, id: string, input: ScheduleInput, active: boolean) {
  const current = await getSchedule(id);
  if (!current) throw new DomainError("Jornada não encontrada.");

  const data = scheduleData(input);
  const changesDefinition =
    current.type !== data.type ||
    JSON.stringify(current.days) !== JSON.stringify(data.days) ||
    current.cycleStartDate !== data.cycleStartDate ||
    current.worksOnHolidays !== data.worksOnHolidays;
  if (current.inUse && changesDefinition) {
    throw new DomainError(
      "Esta jornada já foi atribuída a funcionários, então os horários não podem mudar. Use “Duplicar” para criar uma nova versão e atribua a partir da data desejada.",
    );
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.workSchedule.update({ where: { id }, data: { ...data, active } });
      await audit(
        {
          actorId: actor.id,
          action: "schedule.update",
          entity: "work_schedule",
          entityId: id,
          before: {
            name: current.name,
            description: current.description,
            type: current.type,
            days: current.days as Prisma.InputJsonValue,
            cycleStartDate: current.cycleStartDate,
            worksOnHolidays: current.worksOnHolidays,
            active: current.active,
          },
          after: { ...data, active },
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueError(error)) throw new DomainError("Já existe uma jornada com este nome.", "name");
    throw error;
  }
}

export async function duplicateSchedule(actor: CurrentUser, id: string) {
  const source = await getSchedule(id);
  if (!source) throw new DomainError("Jornada não encontrada.");
  let name = `${source.name} (cópia)`;
  for (let i = 2; await db.workSchedule.count({ where: { name } }); i++) name = `${source.name} (cópia ${i})`;

  return db.$transaction(async (tx) => {
    const copy = await tx.workSchedule.create({
      data: {
        name,
        description: source.description,
        type: source.type,
        days: source.days as Prisma.InputJsonValue,
        cycleStartDate: source.cycleStartDate,
        worksOnHolidays: source.worksOnHolidays,
      },
    });
    await audit({ actorId: actor.id, action: "schedule.duplicate", entity: "work_schedule", entityId: copy.id, after: { from: id } }, tx);
    return copy;
  });
}

export async function deleteSchedule(actor: CurrentUser, id: string) {
  const current = await getSchedule(id);
  if (!current) throw new DomainError("Jornada não encontrada.");
  if (current.inUse) throw new DomainError("Esta jornada já foi atribuída a funcionários. Desative-a em vez de excluir.");
  await db.$transaction(async (tx) => {
    await tx.workSchedule.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "schedule.delete", entity: "work_schedule", entityId: id, before: { name: current.name } }, tx);
  });
}

// ---------------------------------------------------------------------------
// Atribuição de jornada ao funcionário
// ---------------------------------------------------------------------------

export async function listAssignments(userId: string) {
  return db.scheduleAssignment.findMany({
    where: { userId },
    include: { schedule: { select: { id: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
}

/** Atribui a jornada a partir de `startDate`. Mesma data substitui a atribuição existente. */
export async function assignSchedule(actor: CurrentUser, userId: string, scheduleId: string, startDate: string) {
  const schedule = await db.workSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule?.active) throw new DomainError("Selecione uma jornada ativa.", "scheduleId");

  await db.$transaction(async (tx) => {
    await tx.scheduleAssignment.upsert({
      where: { userId_startDate: { userId, startDate } },
      create: { userId, scheduleId, startDate },
      update: { scheduleId },
    });
    await audit(
      { actorId: actor.id, action: "schedule.assign", entity: "user", entityId: userId, after: { scheduleId, startDate } },
      tx,
    );
  });
}

/** Só atribuições futuras podem ser removidas; as passadas fazem parte do histórico da jornada. */
export async function removeAssignment(actor: CurrentUser, userId: string, assignmentId: string) {
  const assignment = await db.scheduleAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.userId !== userId) throw new DomainError("Atribuição não encontrada.");
  if (assignment.startDate <= dateKey(new Date())) {
    throw new DomainError("Atribuições que já começaram fazem parte do histórico. Atribua uma nova jornada a partir de hoje.");
  }
  await db.$transaction(async (tx) => {
    await tx.scheduleAssignment.delete({ where: { id: assignmentId } });
    await audit(
      {
        actorId: actor.id,
        action: "schedule.unassign",
        entity: "user",
        entityId: assignment.userId,
        before: { scheduleId: assignment.scheduleId, startDate: assignment.startDate },
      },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Feriados
// ---------------------------------------------------------------------------

export async function listHolidays(year: number) {
  return db.holiday.findMany({
    where: { date: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
    orderBy: { date: "asc" },
  });
}

export async function createHoliday(actor: CurrentUser, input: HolidayInput) {
  try {
    await db.$transaction(async (tx) => {
      const holiday = await tx.holiday.create({ data: input });
      await audit({ actorId: actor.id, action: "holiday.create", entity: "holiday", entityId: holiday.id, after: input }, tx);
    });
  } catch (error) {
    if (isUniqueError(error)) throw new DomainError("Este feriado já está cadastrado nesta data.", "name");
    throw error;
  }
}

export async function deleteHoliday(actor: CurrentUser, id: string) {
  const holiday = await db.holiday.findUnique({ where: { id } });
  if (!holiday) throw new DomainError("Feriado não encontrado.");
  await db.$transaction(async (tx) => {
    await tx.holiday.delete({ where: { id } });
    await audit(
      { actorId: actor.id, action: "holiday.delete", entity: "holiday", entityId: id, before: { date: holiday.date, name: holiday.name } },
      tx,
    );
  });
}

/** Importa os feriados nacionais do ano (e, se pedido, os pontos facultativos). Ignora os já cadastrados. */
export async function importNationalHolidays(actor: CurrentUser, year: number, includeOptional: boolean) {
  const list = nationalHolidays(year, includeOptional);
  const { count } = await db.holiday.createMany({
    data: list.map((h) => ({ date: h.date, name: h.name, scope: "NATIONAL" as const })),
    skipDuplicates: true,
  });
  await audit({ actorId: actor.id, action: "holiday.import", entity: "holiday", after: { year, includeOptional, count } });
  return count;
}

// ---------------------------------------------------------------------------
// Tolerância
// ---------------------------------------------------------------------------

export async function updateTolerance(actor: CurrentUser, input: ToleranceInput) {
  const current = await getOrganization();
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: ORGANIZATION_ID }, data: input });
    await audit(
      {
        actorId: actor.id,
        action: "tolerance.update",
        entity: "organization",
        entityId: ORGANIZATION_ID,
        before: {
          tolerancePerPunchMinutes: current.tolerancePerPunchMinutes,
          toleranceDailyMinutes: current.toleranceDailyMinutes,
          scheduleWarningMarginMinutes: current.scheduleWarningMarginMinutes,
        },
        after: input,
      },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Jornada prevista
// ---------------------------------------------------------------------------

export type ExpectedDay = {
  date: string;
  schedule: { id: string; name: string } | null;
  holiday: string | null;
  periods: Period[];
};

/** Jornada prevista do funcionário em cada dia de `dates` (YYYY-MM-DD). */
export async function expectedDays(userId: string, dates: string[]): Promise<ExpectedDay[]> {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const [assignments, holidays] = await Promise.all([
    db.scheduleAssignment.findMany({ where: { userId }, include: { schedule: true } }),
    db.holiday.findMany({ where: { date: { gte: sorted[0], lte: sorted.at(-1)! } } }),
  ]);
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]));

  return dates.map((date) => {
    const holiday = holidayByDate.get(date) ?? null;
    const assignment = assignmentForDay(assignments, date);
    if (!assignment) return { date, schedule: null, holiday, periods: [] };
    return {
      date,
      schedule: { id: assignment.schedule.id, name: assignment.schedule.name },
      holiday,
      periods: periodsForDay(toDefinition(assignment.schedule), date, holiday !== null),
    };
  });
}

/** Jornada de hoje e de ontem (turno noturno), em instantes UTC, para conferir a batida. */
export async function scheduleWindow(userId: string, now: Date) {
  const today = dateKey(now);
  const yesterday = addDays(today, -1);
  const [y, t] = await expectedDays(userId, [yesterday, today]);
  return {
    hasSchedule: t.schedule !== null,
    today: t,
    intervals: { yesterday: toIntervals(yesterday, y.periods), today: toIntervals(today, t.periods) },
  };
}
