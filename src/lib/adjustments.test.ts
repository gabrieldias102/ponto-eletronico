import { describe, expect, it } from "vitest";
import {
  countEffective,
  daysInRange,
  effectivePunches,
  initialStatus,
  reviewableStep,
  statusAfter,
} from "./adjustments";

describe("fluxo de aprovação", () => {
  it("começa no gestor; sem gestor, vai direto ao RH", () => {
    expect(initialStatus(true)).toBe("PENDING_MANAGER");
    expect(initialStatus(false)).toBe("PENDING_HR");
  });

  it("gestor aprova → RH; RH aprova → aprovado; qualquer rejeição encerra", () => {
    expect(statusAfter("MANAGER", "APPROVED")).toBe("PENDING_HR");
    expect(statusAfter("HR", "APPROVED")).toBe("APPROVED");
    expect(statusAfter("MANAGER", "REJECTED")).toBe("REJECTED");
    expect(statusAfter("HR", "REJECTED")).toBe("REJECTED");
  });
});

describe("reviewableStep", () => {
  const manager = { id: "m1", role: "MANAGER" as const };
  const otherManager = { id: "m2", role: "MANAGER" as const };
  const hr = { id: "h1", role: "HR" as const };
  const admin = { id: "a1", role: "ADMIN" as const };
  const employee = { id: "e1", role: "EMPLOYEE" as const };

  it("na etapa do gestor, só o gestor do setor (ou o Admin) decide", () => {
    const request = { status: "PENDING_MANAGER" as const, departmentManagerId: "m1" };
    expect(reviewableStep(manager, request)).toBe("MANAGER");
    expect(reviewableStep(otherManager, request)).toBeNull();
    expect(reviewableStep(hr, request)).toBeNull();
    expect(reviewableStep(admin, request)).toBe("MANAGER");
    expect(reviewableStep(employee, request)).toBeNull();
  });

  it("na etapa do RH, RH e Admin decidem; gestor não", () => {
    const request = { status: "PENDING_HR" as const, departmentManagerId: "m1" };
    expect(reviewableStep(hr, request)).toBe("HR");
    expect(reviewableStep(admin, request)).toBe("HR");
    expect(reviewableStep(manager, request)).toBeNull();
  });

  it("solicitação encerrada não tem etapa", () => {
    for (const status of ["APPROVED", "REJECTED", "CANCELLED"] as const) {
      expect(reviewableStep(admin, { status, departmentManagerId: null })).toBeNull();
    }
  });
});

describe("effectivePunches", () => {
  const at = (hhmm: string) => new Date(`2026-10-16T${hhmm}:00-03:00`);
  const entries = [
    { id: "e1", punchedAt: at("08:03") },
    { id: "e2", punchedAt: at("12:40") }, // batida errada
  ];

  it("inclui ajustes em ordem e mantém a original corrigida marcada", () => {
    const list = effectivePunches(entries, [
      { id: "r1", type: "CORRECTION", requestedAt: at("12:00"), timeEntryId: "e2" },
      { id: "r2", type: "INCLUSION", requestedAt: at("13:00"), timeEntryId: null },
    ]);
    expect(list.map((p) => (p.kind === "entry" ? `${p.entry.id}${p.superseded ? "×" : ""}` : p.requestId))).toEqual([
      "e1",
      "r1",
      "e2×",
      "r2",
    ]);
    expect(countEffective(list)).toBe(3);
  });

  it("abono não vira marcação", () => {
    const list = effectivePunches(entries, [{ id: "r3", type: "ABSENCE", requestedAt: null, timeEntryId: null }]);
    expect(list).toHaveLength(2);
  });
});

describe("daysInRange", () => {
  it("lista os dias inclusive, virando o mês", () => {
    expect(daysInRange("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(daysInRange("2026-10-16", "2026-10-16")).toEqual(["2026-10-16"]);
  });
});
