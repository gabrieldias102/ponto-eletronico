import { describe, expect, it } from "vitest";
import {
  adjustmentSchema,
  allowedLocationSchema,
  organizationSchema,
  punchSettingsSchema,
  scheduleSchema,
  userPunchOverridesSchema,
  userSchema,
} from "./validation";

const baseUser = {
  name: "Maria Souza",
  email: "  Maria@Empresa.com ",
  role: "EMPLOYEE",
  departmentId: "dep_1",
  active: true,
};

describe("userSchema", () => {
  it("normaliza o e-mail", () => {
    const result = userSchema.parse(baseUser);
    expect(result.email).toBe("maria@empresa.com");
  });

  it("exige setor para quem bate ponto", () => {
    const result = userSchema.safeParse({ ...baseUser, departmentId: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["departmentId"]);
  });

  it("administrador não tem setor", () => {
    const result = userSchema.parse({ ...baseUser, role: "ADMIN" });
    expect(result.departmentId).toBeNull();
  });

  it("rejeita perfil desconhecido", () => {
    expect(userSchema.safeParse({ ...baseUser, role: "ROOT" }).success).toBe(false);
  });
});

describe("organizationSchema", () => {
  const base = { name: "Empresa", legalName: "", taxId: "", primaryColor: "#0d9488" };

  it("aceita CNPJ e CPF com ou sem máscara", () => {
    expect(organizationSchema.safeParse({ ...base, taxId: "12.345.678/0001-90" }).success).toBe(true);
    expect(organizationSchema.safeParse({ ...base, taxId: "123.456.789-09" }).success).toBe(true);
  });

  it("rejeita documento com tamanho inválido", () => {
    expect(organizationSchema.safeParse({ ...base, taxId: "1234" }).success).toBe(false);
  });

  it("campos opcionais vazios viram null", () => {
    const result = organizationSchema.parse(base);
    expect(result.legalName).toBeNull();
    expect(result.taxId).toBeNull();
  });
});

describe("punchSettingsSchema", () => {
  const base = {
    punchRequireGeolocation: false,
    punchRequireGeofence: false,
    punchRequireSelfie: false,
    punchRequireQrCode: false,
    businessHoursStart: "08:00",
    businessHoursEnd: "18:00",
    businessDays: [5, 1, 3, 1],
  };

  it("ordena e remove dias repetidos", () => {
    expect(punchSettingsSchema.parse(base).businessDays).toEqual([1, 3, 5]);
  });

  it("exige término depois do início", () => {
    const r = punchSettingsSchema.safeParse({ ...base, businessHoursEnd: "07:00" });
    expect(r.error?.issues[0]?.path).toEqual(["businessHoursEnd"]);
  });

  it("exige ao menos um dia", () => {
    expect(punchSettingsSchema.safeParse({ ...base, businessDays: [] }).success).toBe(false);
  });
});

describe("userPunchOverridesSchema", () => {
  it("converte o seletor de três estados", () => {
    expect(
      userPunchOverridesSchema.parse({
        punchRequireGeolocation: "yes",
        punchRequireGeofence: "no",
        punchRequireSelfie: "default",
      }),
    ).toEqual({
      punchRequireGeolocation: true,
      punchRequireGeofence: false,
      punchRequireSelfie: null,
      punchRequireQrCode: null,
    });
  });
});

describe("allowedLocationSchema", () => {
  it("aceita números vindos do formulário", () => {
    const r = allowedLocationSchema.parse({ name: "Sede", latitude: "-23.56", longitude: "-46.65", radiusMeters: "150" });
    expect(r).toEqual({ name: "Sede", latitude: -23.56, longitude: -46.65, radiusMeters: 150 });
  });

  it("limita o raio", () => {
    expect(allowedLocationSchema.safeParse({ name: "Sede", latitude: 0, longitude: 0, radiusMeters: 5 }).success).toBe(false);
  });
});

describe("scheduleSchema", () => {
  const weekly = (days: Record<string, { start: string; end: string }[]>) => ({
    type: "WEEKLY",
    name: "Comercial",
    description: "",
    worksOnHolidays: false,
    days,
  });

  it("aceita jornada comercial", () => {
    const r = scheduleSchema.safeParse(
      weekly({ "1": [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }] }),
    );
    expect(r.success).toBe(true);
  });

  it("recusa períodos sobrepostos ou fora de ordem", () => {
    const r = scheduleSchema.safeParse(
      weekly({ "1": [{ start: "08:00", end: "12:00" }, { start: "11:00", end: "17:00" }] }),
    );
    expect(r.success).toBe(false);
  });

  it("só o último período pode virar a meia-noite", () => {
    expect(scheduleSchema.safeParse(weekly({ "1": [{ start: "18:00", end: "22:00" }, { start: "23:00", end: "03:00" }] })).success).toBe(true);
    expect(scheduleSchema.safeParse(weekly({ "1": [{ start: "22:00", end: "02:00" }, { start: "03:00", end: "06:00" }] })).success).toBe(false);
  });

  it("limita a 4 períodos e exige um dia de trabalho", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ start: `0${i}:00`, end: `0${i}:30` }));
    expect(scheduleSchema.safeParse(weekly({ "1": five })).success).toBe(false);
    expect(scheduleSchema.safeParse(weekly({ "1": [] })).success).toBe(false);
  });

  it("ciclo exige data de início", () => {
    const base = { type: "CYCLE", name: "12x36", description: "", worksOnHolidays: true, days: [[{ start: "07:00", end: "19:00" }], []] };
    expect(scheduleSchema.safeParse({ ...base, cycleStartDate: "2026-10-01" }).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...base, cycleStartDate: "" }).success).toBe(false);
  });
});

describe("adjustmentSchema", () => {
  const absence = {
    type: "ABSENCE",
    date: "2026-10-14",
    endDate: "2026-10-16",
    partial: false,
    absenceStart: "",
    absenceEnd: "",
    justification: "Atestado médico",
  };

  it("aceita abono de vários dias", () => {
    expect(adjustmentSchema.safeParse(absence).success).toBe(true);
  });

  it("abono parcial é de um único dia, com início antes do término", () => {
    expect(adjustmentSchema.safeParse({ ...absence, partial: true, absenceStart: "14:00", absenceEnd: "16:00" }).success).toBe(false);
    expect(
      adjustmentSchema.safeParse({ ...absence, endDate: "2026-10-14", partial: true, absenceStart: "14:00", absenceEnd: "16:00" }).success,
    ).toBe(true);
    expect(
      adjustmentSchema.safeParse({ ...absence, endDate: "2026-10-14", partial: true, absenceStart: "16:00", absenceEnd: "14:00" }).success,
    ).toBe(false);
  });

  it("correção exige a marcação", () => {
    const r = adjustmentSchema.safeParse({ type: "CORRECTION", date: "2026-10-16", timeEntryId: "", time: "12:00", justification: "" });
    expect(r.success).toBe(false);
  });

  it("justificativa vazia vira null", () => {
    const r = adjustmentSchema.parse({ type: "INCLUSION", date: "2026-10-16", time: "08:00", justification: "  " });
    expect(r.justification).toBeNull();
  });
});
