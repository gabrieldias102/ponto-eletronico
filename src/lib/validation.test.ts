import { describe, expect, it } from "vitest";
import { organizationSchema, userSchema } from "./validation";

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
