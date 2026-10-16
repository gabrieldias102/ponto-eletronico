import { describe, expect, it } from "vitest";
import { easterSunday, nationalHolidays } from "./holidays";

describe("easterSunday", () => {
  it("bate com as datas conhecidas", () => {
    expect(easterSunday(2024)).toBe("2024-03-31");
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });
});

describe("nationalHolidays", () => {
  it("lista os 10 feriados nacionais de 2026 em ordem", () => {
    const list = nationalHolidays(2026);
    expect(list).toHaveLength(10);
    expect(list[0]).toMatchObject({ date: "2026-01-01" });
    expect(list.find((h) => h.name === "Sexta-feira Santa")?.date).toBe("2026-04-03");
    expect(list.some((h) => h.date === "2026-11-20")).toBe(true);
    expect(list.every((h) => !h.optional)).toBe(true);
  });

  it("inclui Carnaval e Corpus Christi quando pedido", () => {
    const list = nationalHolidays(2026, true);
    expect(list).toHaveLength(13);
    expect(list.find((h) => h.name === "Carnaval (terça-feira)")?.date).toBe("2026-02-17");
    expect(list.find((h) => h.name === "Corpus Christi")?.date).toBe("2026-06-04");
  });
});
