import { zonedToUtc } from "@/lib/time";

/** Período de trabalho em hora local. Término <= início atravessa a meia-noite (turno noturno). */
export type Period = { start: string; end: string };

/** Dias da semana (0 = domingo) → períodos. Dia ausente ou vazio = folga. */
export type WeeklyDays = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", Period[]>>;
/** Dias do ciclo, em ordem. Lista vazia = folga. */
export type CycleDays = Period[][];

export type ScheduleDefinition =
  | { type: "WEEKLY"; days: WeeklyDays; worksOnHolidays: boolean }
  | { type: "CYCLE"; days: CycleDays; cycleStartDate: string; worksOnHolidays: boolean };

/** Máximo de períodos por dia: 4 períodos = 8 marcações. */
export const MAX_PERIODS_PER_DAY = 4;

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function crossesMidnight(p: Period): boolean {
  return toMinutes(p.end) <= toMinutes(p.start);
}

export function periodMinutes(p: Period): number {
  const diff = toMinutes(p.end) - toMinutes(p.start);
  return diff > 0 ? diff : diff + 24 * 60;
}

export function dayMinutes(periods: Period[]): number {
  return periods.reduce((sum, p) => sum + periodMinutes(p), 0);
}

/** Carga semanal (WEEKLY) ou média semanal do ciclo (CYCLE), em minutos. */
export function weeklyMinutes(def: Pick<ScheduleDefinition, "type" | "days">): number {
  if (def.type === "WEEKLY") {
    return Object.values(def.days as WeeklyDays).reduce((sum, p) => sum + dayMinutes(p ?? []), 0);
  }
  const days = def.days as CycleDays;
  if (days.length === 0) return 0;
  const total = days.reduce((sum, p) => sum + dayMinutes(p), 0);
  return Math.round((total / days.length) * 7);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Dias entre duas datas "YYYY-MM-DD" (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** "YYYY-MM-DD" deslocada em `delta` dias. */
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de "YYYY-MM-DD". */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Períodos previstos para o dia `key`. Feriado vira folga, a não ser que a jornada trabalhe em feriados.
 * No ciclo, datas anteriores ao início também seguem o ciclo (contando para trás).
 */
export function periodsForDay(def: ScheduleDefinition, key: string, isHoliday: boolean): Period[] {
  if (isHoliday && !def.worksOnHolidays) return [];
  if (def.type === "WEEKLY") {
    return def.days[String(weekdayOf(key)) as keyof WeeklyDays] ?? [];
  }
  const length = def.days.length;
  if (length === 0) return [];
  const index = ((daysBetween(def.cycleStartDate, key) % length) + length) % length;
  return def.days[index];
}

export type Interval = { start: Date; end: Date };

/** Converte os períodos de um dia em instantes UTC. Período noturno termina no dia seguinte. */
export function toIntervals(key: string, periods: Period[]): Interval[] {
  const [y, m, d] = key.split("-").map(Number);
  return periods.map((p) => {
    const [sh, sm] = p.start.split(":").map(Number);
    const [eh, em] = p.end.split(":").map(Number);
    return {
      start: zonedToUtc(y, m, d, sh, sm),
      end: zonedToUtc(y, m, crossesMidnight(p) ? d + 1 : d, eh, em),
    };
  });
}

/**
 * Se `now` está dentro de algum período previsto, com `marginMinutes` de folga antes e depois.
 * Considera também os períodos de ontem, para o turno noturno que vira a meia-noite.
 */
export function isWithinSchedule(
  now: Date,
  intervalsByDay: { today: Interval[]; yesterday: Interval[] },
  marginMinutes: number,
): boolean {
  const margin = marginMinutes * 60_000;
  const t = now.getTime();
  return [...intervalsByDay.yesterday, ...intervalsByDay.today].some(
    (i) => t >= i.start.getTime() - margin && t <= i.end.getTime() + margin,
  );
}

/** Atribuição vigente no dia: a de maior data de início que não seja posterior ao dia. */
export function assignmentForDay<A extends { startDate: string }>(assignments: A[], key: string): A | null {
  let current: A | null = null;
  for (const a of assignments) {
    if (a.startDate <= key && (!current || a.startDate > current.startDate)) current = a;
  }
  return current;
}

export function describePeriods(periods: Period[]): string {
  return periods.length === 0 ? "Folga" : periods.map((p) => `${p.start}–${p.end}`).join(", ");
}

