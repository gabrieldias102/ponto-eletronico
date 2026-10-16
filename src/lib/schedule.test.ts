import { describe, expect, it } from "vitest";
import {
  addDays,
  assignmentForDay,
  dayMinutes,
  daysBetween,
  formatMinutes,
  isWithinSchedule,
  periodMinutes,
  periodsForDay,
  toIntervals,
  weekdayOf,
  weeklyMinutes,
  type ScheduleDefinition,
} from "./schedule";

const commercial: ScheduleDefinition = {
  type: "WEEKLY",
  worksOnHolidays: false,
  days: Object.fromEntries(
    [1, 2, 3, 4, 5].map((d) => [
      String(d),
      [
        { start: "08:00", end: "12:00" },
        { start: "13:00", end: "17:48" },
      ],
    ]),
  ),
};

const twelveByThirtySix: ScheduleDefinition = {
  type: "CYCLE",
  worksOnHolidays: true,
  cycleStartDate: "2026-10-01",
  days: [[{ start: "19:00", end: "07:00" }], []],
};

describe("durações", () => {
  it("soma períodos e trata o turno noturno", () => {
    expect(periodMinutes({ start: "08:00", end: "12:00" })).toBe(240);
    expect(periodMinutes({ start: "22:00", end: "06:00" })).toBe(480);
    expect(dayMinutes([{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:48" }])).toBe(528);
  });

  it("carga semanal de 44h na jornada comercial", () => {
    expect(weeklyMinutes(commercial)).toBe(44 * 60);
    expect(formatMinutes(44 * 60)).toBe("44h");
    expect(formatMinutes(528)).toBe("8h48");
  });

  it("média semanal do 12x36 é 42h", () => {
    expect(weeklyMinutes(twelveByThirtySix)).toBe(42 * 60);
  });
});

describe("datas", () => {
  it("calcula diferença, soma e dia da semana", () => {
    expect(daysBetween("2026-10-01", "2026-10-16")).toBe(15);
    expect(daysBetween("2026-10-16", "2026-10-01")).toBe(-15);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(weekdayOf("2026-10-16")).toBe(5); // sexta-feira
  });
});

describe("periodsForDay", () => {
  it("semanal: dia útil, fim de semana e feriado", () => {
    expect(periodsForDay(commercial, "2026-10-16", false)).toHaveLength(2);
    expect(periodsForDay(commercial, "2026-10-17", false)).toEqual([]); // sábado
    expect(periodsForDay(commercial, "2026-10-12", true)).toEqual([]); // feriado em uma segunda
  });

  it("ciclo 12x36 alterna trabalho e folga a partir da data de início", () => {
    expect(periodsForDay(twelveByThirtySix, "2026-10-01", false)).toHaveLength(1);
    expect(periodsForDay(twelveByThirtySix, "2026-10-02", false)).toEqual([]);
    expect(periodsForDay(twelveByThirtySix, "2026-10-03", false)).toHaveLength(1);
    // Antes do início, o ciclo continua para trás.
    expect(periodsForDay(twelveByThirtySix, "2026-09-30", false)).toEqual([]);
    expect(periodsForDay(twelveByThirtySix, "2026-09-29", false)).toHaveLength(1);
  });

  it("jornada que trabalha em feriado não folga", () => {
    expect(periodsForDay(twelveByThirtySix, "2026-10-01", true)).toHaveLength(1);
  });
});

describe("toIntervals e isWithinSchedule", () => {
  it("converte para UTC (São Paulo = UTC-3)", () => {
    const [morning] = toIntervals("2026-10-16", [{ start: "08:00", end: "12:00" }]);
    expect(morning.start.toISOString()).toBe("2026-10-16T11:00:00.000Z");
    expect(morning.end.toISOString()).toBe("2026-10-16T15:00:00.000Z");
  });

  it("turno noturno termina no dia seguinte", () => {
    const [night] = toIntervals("2026-10-01", [{ start: "19:00", end: "07:00" }]);
    expect(night.end.toISOString()).toBe("2026-10-02T10:00:00.000Z");
  });

  it("aplica a margem antes e depois", () => {
    const today = toIntervals("2026-10-16", [{ start: "08:00", end: "12:00" }]);
    const at = (iso: string) => isWithinSchedule(new Date(iso), { today, yesterday: [] }, 30);
    expect(at("2026-10-16T10:35:00Z")).toBe(true); // 07:35, dentro da margem
    expect(at("2026-10-16T10:25:00Z")).toBe(false); // 07:25
    expect(at("2026-10-16T15:29:00Z")).toBe(true); // 12:29
    expect(at("2026-10-16T15:31:00Z")).toBe(false); // 12:31
  });

  it("saída do turno noturno de ontem conta como dentro da jornada", () => {
    const yesterday = toIntervals("2026-10-01", [{ start: "19:00", end: "07:00" }]);
    expect(isWithinSchedule(new Date("2026-10-02T09:50:00Z"), { today: [], yesterday }, 30)).toBe(true); // 06:50
  });
});

describe("assignmentForDay", () => {
  const history = [
    { id: "a", startDate: "2026-01-01" },
    { id: "b", startDate: "2026-10-10" },
  ];

  it("usa a atribuição vigente na data", () => {
    expect(assignmentForDay(history, "2026-05-01")?.id).toBe("a");
    expect(assignmentForDay(history, "2026-10-10")?.id).toBe("b");
    expect(assignmentForDay(history, "2026-12-01")?.id).toBe("b");
  });

  it("antes da primeira atribuição não há jornada", () => {
    expect(assignmentForDay(history, "2025-12-31")).toBeNull();
  });
});
