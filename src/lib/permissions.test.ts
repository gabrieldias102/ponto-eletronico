import { describe, expect, it } from "vitest";
import { assignableRoles, can, canManageUser, requiresDepartment } from "./permissions";

describe("can", () => {
  it("o administrador não bate ponto, mas gerencia tudo", () => {
    expect(can("ADMIN", "punch:own")).toBe(false);
    expect(can("ADMIN", "adjustment:request")).toBe(false);
    expect(can("ADMIN", "users:manage")).toBe(true);
    expect(can("ADMIN", "departments:manage")).toBe(true);
    expect(can("ADMIN", "settings:manage")).toBe(true);
    expect(can("ADMIN", "audit:view")).toBe(true);
    expect(can("ADMIN", "adjustment:review:manager")).toBe(true);
    expect(can("ADMIN", "adjustment:review:hr")).toBe(true);
  });

  it("o RH bate ponto, vê o ponto de todos e aprova na etapa do RH", () => {
    expect(can("HR", "punch:own")).toBe(true);
    expect(can("HR", "adjustment:request")).toBe(true);
    expect(can("HR", "timesheet:all")).toBe(true);
    expect(can("HR", "adjustment:review:hr")).toBe(true);
    expect(can("HR", "adjustment:review:manager")).toBe(false);
    expect(can("HR", "users:manage")).toBe(true);
    expect(can("HR", "settings:manage")).toBe(false);
    expect(can("HR", "audit:view")).toBe(false);
  });

  it("o gestor vê a equipe e aprova na etapa do gestor", () => {
    expect(can("MANAGER", "punch:own")).toBe(true);
    expect(can("MANAGER", "timesheet:team")).toBe(true);
    expect(can("MANAGER", "timesheet:all")).toBe(false);
    expect(can("MANAGER", "adjustment:review:manager")).toBe(true);
    expect(can("MANAGER", "adjustment:review:hr")).toBe(false);
    expect(can("MANAGER", "users:manage")).toBe(false);
  });

  it("o usuário só acessa o próprio ponto e solicita ajustes", () => {
    expect(can("EMPLOYEE", "punch:own")).toBe(true);
    expect(can("EMPLOYEE", "timesheet:own")).toBe(true);
    expect(can("EMPLOYEE", "adjustment:request")).toBe(true);
    expect(can("EMPLOYEE", "timesheet:team")).toBe(false);
    expect(can("EMPLOYEE", "dashboard:view")).toBe(false);
  });
});

describe("assignableRoles / canManageUser", () => {
  it("o administrador atribui qualquer perfil", () => {
    expect(assignableRoles("ADMIN")).toEqual(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]);
  });

  it("o RH não cria nem edita administradores", () => {
    expect(assignableRoles("HR")).not.toContain("ADMIN");
    expect(canManageUser("HR", "ADMIN")).toBe(false);
    expect(canManageUser("HR", "EMPLOYEE")).toBe(true);
  });

  it("gestor e usuário não gerenciam usuários", () => {
    expect(assignableRoles("MANAGER")).toEqual([]);
    expect(canManageUser("EMPLOYEE", "EMPLOYEE")).toBe(false);
  });
});

describe("requiresDepartment", () => {
  it("todos que batem ponto precisam de setor", () => {
    expect(requiresDepartment("ADMIN")).toBe(false);
    expect(requiresDepartment("HR")).toBe(true);
    expect(requiresDepartment("MANAGER")).toBe(true);
    expect(requiresDepartment("EMPLOYEE")).toBe(true);
  });
});
