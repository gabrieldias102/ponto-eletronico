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

/** Término <= início atravessa a meia-noite; início = término é um turno de 24h. */
const periodSchema = z.object({ start: timeOfDay, end: timeOfDay });

/** Períodos de um dia: no máximo 4, em ordem, sem sobreposição; só o último pode virar a meia-noite. */
const dayPeriodsSchema = z
  .array(periodSchema)
  .max(4, "No máximo 4 períodos por dia (8 marcações).")
  .superRefine((periods, ctx) => {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    let previousEnd = -1;
    periods.forEach((p, i) => {
      const start = toMin(p.start);
      let end = toMin(p.end);
      const crosses = end <= start;
      if (crosses) end += 24 * 60;
      if (crosses && i !== periods.length - 1) {
        ctx.addIssue({ code: "custom", message: "Só o último período do dia pode terminar após a meia-noite." });
      }
      if (start < previousEnd) {
        ctx.addIssue({ code: "custom", message: "Os períodos devem estar em ordem e sem sobreposição." });
      }
      previousEnd = end;
    });
  });

const weekdayKey = z.enum(["0", "1", "2", "3", "4", "5", "6"]);

export const scheduleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("WEEKLY"),
    name: z.string().trim().min(2, "Informe o nome da jornada.").max(80),
    description: optionalText,
    worksOnHolidays: z.boolean(),
    days: z
      .partialRecord(weekdayKey, dayPeriodsSchema)
      .refine((d) => Object.values(d).some((p) => (p?.length ?? 0) > 0), "Defina ao menos um dia de trabalho."),
  }),
  z.object({
    type: z.literal("CYCLE"),
    name: z.string().trim().min(2, "Informe o nome da jornada.").max(80),
    description: optionalText,
    worksOnHolidays: z.boolean(),
    cycleStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início do ciclo."),
    days: z
      .array(dayPeriodsSchema)
      .min(1, "O ciclo precisa de ao menos 1 dia.")
      .max(28, "O ciclo pode ter no máximo 28 dias.")
      .refine((d) => d.some((p) => p.length > 0), "Defina ao menos um dia de trabalho."),
  }),
]);

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  name: z.string().trim().min(2, "Informe o nome do feriado.").max(80),
  scope: z.enum(["NATIONAL", "STATE", "MUNICIPAL"]),
});

export type HolidayInput = z.infer<typeof holidaySchema>;

export const toleranceSchema = z.object({
  tolerancePerPunchMinutes: z.coerce.number().int().min(0, "Mínimo 0.").max(60, "Máximo 60 min."),
  toleranceDailyMinutes: z.coerce.number().int().min(0, "Mínimo 0.").max(120, "Máximo 120 min."),
  scheduleWarningMarginMinutes: z.coerce.number().int().min(0, "Mínimo 0.").max(240, "Máximo 240 min."),
});

export type ToleranceInput = z.infer<typeof toleranceSchema>;

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data.");
const justificationSchema = z
  .string()
  .trim()
  .max(1000, "Use no máximo 1.000 caracteres.")
  .transform((v) => (v === "" ? null : v));

export const adjustmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INCLUSION"),
    date: dateKeySchema,
    time: timeOfDay,
    justification: justificationSchema,
  }),
  z.object({
    type: z.literal("CORRECTION"),
    date: dateKeySchema,
    timeEntryId: z.string().min(1, "Selecione a marcação a corrigir."),
    time: timeOfDay,
    justification: justificationSchema,
  }),
  z
    .object({
      type: z.literal("ABSENCE"),
      date: dateKeySchema,
      endDate: dateKeySchema,
      partial: z.boolean(),
      absenceStart: z.string(),
      absenceEnd: z.string(),
      justification: justificationSchema,
    })
    .superRefine((d, ctx) => {
      if (d.endDate < d.date) ctx.addIssue({ code: "custom", path: ["endDate"], message: "O último dia deve ser depois do primeiro." });
      if (d.partial) {
        if (d.endDate !== d.date) {
          ctx.addIssue({ code: "custom", path: ["endDate"], message: "Abono de período parcial vale para um único dia." });
        }
        const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!hhmm.test(d.absenceStart)) ctx.addIssue({ code: "custom", path: ["absenceStart"], message: "Informe o início." });
        if (!hhmm.test(d.absenceEnd)) ctx.addIssue({ code: "custom", path: ["absenceEnd"], message: "Informe o término." });
        if (hhmm.test(d.absenceStart) && hhmm.test(d.absenceEnd) && d.absenceEnd <= d.absenceStart) {
          ctx.addIssue({ code: "custom", path: ["absenceEnd"], message: "O término deve ser depois do início." });
        }
      }
    }),
]);

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
