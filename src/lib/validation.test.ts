import { describe, expect, it } from "vitest";
import {
  allowedLocationSchema,
  organizationSchema,
  punchSettingsSchema,
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
