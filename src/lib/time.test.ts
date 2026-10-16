import { describe, expect, it } from "vitest";
import { dateKey, dayRange, parseDayKey, parseMonthKey, shiftMonth, zonedParts, zonedToUtc } from "./time";

describe("fuso America/Sao_Paulo (UTC-3)", () => {
  it("converte UTC para a hora local", () => {
    // 02:30 UTC do dia 17 = 23:30 do dia 16 em São Paulo
    const p = zonedParts(new Date("2026-10-17T02:30:00Z"));
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 10, 16, 23, 30]);
    expect(p.weekday).toBe(5); // sexta-feira
  });

  it("converte hora local para UTC", () => {
    expect(zonedToUtc(2026, 10, 16, 8, 0).toISOString()).toBe("2026-10-16T11:00:00.000Z");
  });

  it("calcula o dia local, inclusive perto da meia-noite UTC", () => {
    expect(dateKey(new Date("2026-10-17T02:59:59Z"))).toBe("2026-10-16");
    expect(dateKey(new Date("2026-10-17T03:00:00Z"))).toBe("2026-10-17");
  });

  it("intervalo do dia vai da meia-noite local à meia-noite seguinte", () => {
    const { start, end } = dayRange(new Date("2026-10-16T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-16T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-17T03:00:00.000Z");
  });

  it("vira o mês e o ano corretamente", () => {
    expect(parseDayKey("2026-12-31")?.end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(parseMonthKey("2026-12")?.end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("rejeita chaves inválidas", () => {
    expect(parseDayKey("2026-13-01")).toBeNull();
    expect(parseDayKey("ontem")).toBeNull();
    expect(parseMonthKey("2026-1")).toBeNull();
    expect(parseMonthKey(undefined)).toBeNull();
  });
});
