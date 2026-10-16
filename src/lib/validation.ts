import { z } from "zod";
import { isHexColor } from "@/lib/color";
import { ROLES, requiresDepartment } from "@/lib/permissions";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const userSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome completo.").max(120),
    email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
    role: z.enum(ROLES, "Selecione um perfil."),
    departmentId: optionalText,
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (requiresDepartment(data.role) && !data.departmentId) {
      ctx.addIssue({ code: "custom", path: ["departmentId"], message: "Selecione o setor." });
    }
  })
  .transform((data) => ({
    ...data,
    // Administrador não pertence a setor.
    departmentId: requiresDepartment(data.role) ? data.departmentId : null,
  }));

export type UserInput = z.infer<typeof userSchema>;

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do setor.").max(80),
  managerId: optionalText,
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(120),
  legalName: optionalText,
  taxId: optionalText.refine(
    (v) => v === null || [11, 14].includes(onlyDigits(v).length),
    "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
  ),
  primaryColor: z.string().refine(isHexColor, "Cor inválida."),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
