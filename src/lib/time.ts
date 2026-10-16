/**
 * Datas no fuso da empresa. O banco guarda UTC; "hoje", "dia da semana" e "hora local"
 * são sempre calculados em America/Sao_Paulo.
 */
export const TIME_ZONE = "America/Sao_Paulo";

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = domingo
};

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

export function zonedParts(date: Date): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS[map.weekday],
  };
}

/** Diferença (ms) entre a hora local e UTC no instante `date`. */
function offsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante UTC correspondente a uma data/hora local. */
export function zonedToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess));
  // Recalcula com o offset do próprio resultado (cobre mudanças de horário de verão).
  return new Date(guess - offsetMs(new Date(first)));
}

/** "YYYY-MM-DD" no fuso da empresa. */
export function dateKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "YYYY-MM" no fuso da empresa. */
export function monthKey(date: Date): string {
  return dateKey(date).slice(0, 7);
}

/** Início (inclusivo) e fim (exclusivo) do dia local de `date`. */
export function dayRange(date: Date): { start: Date; end: Date } {
  const p = zonedParts(date);
  return {
    start: zonedToUtc(p.year, p.month, p.day),
    end: zonedToUtc(p.year, p.month, p.day + 1),
  };
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

/** Intervalo do dia "YYYY-MM-DD", ou null se inválido. */
export function parseDayKey(key: string | undefined): { start: Date; end: Date } | null {
  const m = key?.match(DATE_KEY);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { start: zonedToUtc(y, mo, d), end: zonedToUtc(y, mo, d + 1) };
}

/** Intervalo do mês "YYYY-MM", ou null se inválido. */
export function parseMonthKey(key: string | undefined): { start: Date; end: Date } | null {
  const m = key?.match(MONTH_KEY);
  if (!m) return null;
  const [y, mo] = [Number(m[1]), Number(m[2])];
  if (mo < 1 || mo > 12) return null;
  return { start: zonedToUtc(y, mo, 1), end: zonedToUtc(y, mo + 1, 1) };
}

/** Mês anterior/seguinte de "YYYY-MM". */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const shortTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});

/** Primeira letra maiúscula ("sexta-feira, 16 de outubro" → "Sexta-feira, 16 de outubro"). */
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatTime = (d: Date) => timeFormatter.format(d);
export const formatShortTime = (d: Date) => shortTimeFormatter.format(d);
export const formatDay = (d: Date) => upperFirst(dayFormatter.format(d));
export const formatLongDay = (d: Date) => upperFirst(longDayFormatter.format(d));
export const formatMonth = (d: Date) => upperFirst(monthFormatter.format(d));

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "medium",
});

export const formatDateTime = (d: Date) => dateTimeFormatter.format(d);
