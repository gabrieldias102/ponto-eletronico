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

/** Valor de sobrescrita por usuário: "default" segue a empresa. */
const triState = z
  .enum(["default", "yes", "no"])
  .default("default")
  .transform((v) => (v === "default" ? null : v === "yes"));

export const userPunchOverridesSchema = z.object({
  punchRequireGeolocation: triState,
  punchRequireGeofence: triState,
  punchRequireSelfie: triState,
  punchRequireQrCode: triState,
});

export type UserPunchOverrides = z.infer<typeof userPunchOverridesSchema>;

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use o formato HH:mm.");

export const punchSettingsSchema = z
  .object({
    punchRequireGeolocation: z.boolean(),
    punchRequireGeofence: z.boolean(),
    punchRequireSelfie: z.boolean(),
    punchRequireQrCode: z.boolean(),
    businessHoursStart: timeOfDay,
    businessHoursEnd: timeOfDay,
    businessDays: z.array(z.number().int().min(0).max(6)).min(1, "Selecione ao menos um dia."),
  })
  .refine((d) => d.businessHoursEnd > d.businessHoursStart, {
    path: ["businessHoursEnd"],
    message: "O término deve ser depois do início.",
  })
  .transform((d) => ({ ...d, businessDays: [...new Set(d.businessDays)].sort() }));

export type PunchSettingsInput = z.infer<typeof punchSettingsSchema>;

export const allowedLocationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do local.").max(80),
  latitude: z.coerce.number("Latitude inválida.").min(-90, "Latitude inválida.").max(90, "Latitude inválida."),
  longitude: z.coerce.number("Longitude inválida.").min(-180, "Longitude inválida.").max(180, "Longitude inválida."),
  radiusMeters: z.coerce
    .number("Informe o raio.")
    .int("Use um número inteiro.")
    .min(20, "O raio mínimo é 20 m.")
    .max(5000, "O raio máximo é 5.000 m."),
});

export type AllowedLocationInput = z.infer<typeof allowedLocationSchema>;
