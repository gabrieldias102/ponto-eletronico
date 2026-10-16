import "server-only";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import {
  isValidCoordinate,
  isWithinBusinessHours,
  matchLocation,
  MAX_PUNCHES_PER_DAY,
  resolveRequirements,
  type PunchRequirements,
} from "@/lib/punch-rules";
import { verifyQrToken } from "@/lib/qr-token";
import { dayRange } from "@/lib/time";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { getOrganization, ORGANIZATION_ID } from "@/server/organization";
import { scheduleWindow } from "@/server/schedules";
import { isWithinSchedule } from "@/lib/schedule";
import { uploadPrivateFile } from "@/server/storage";

export const SELFIE_MAX_BYTES = 2 * 1024 * 1024;

export async function getRequirementsFor(userId: string): Promise<PunchRequirements> {
  const [organization, user] = await Promise.all([
    getOrganization(),
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        punchRequireGeolocation: true,
        punchRequireGeofence: true,
        punchRequireSelfie: true,
        punchRequireQrCode: true,
      },
    }),
  ]);
  return resolveRequirements(organization, user);
}

/** Segredo do QR code, criado na primeira vez que for necessário. */
export async function getQrSecret(): Promise<string> {
  const organization = await getOrganization();
  if (organization.qrSecret) return organization.qrSecret;
  const secret = randomBytes(32).toString("base64url");
  // Só grava se ainda estiver vazio, para duas requisições simultâneas não gerarem segredos diferentes.
  await db.organization.updateMany({ where: { id: ORGANIZATION_ID, qrSecret: null }, data: { qrSecret: secret } });
  const updated = await db.organization.findUniqueOrThrow({ where: { id: ORGANIZATION_ID } });
  return updated.qrSecret!;
}

export type PunchInput = {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  qrToken: string | null;
  selfie: File | null;
  confirmOutsideHours: boolean;
};

export type PunchResult =
  | { status: "needs-confirmation" }
  | { status: "registered"; nsr: bigint; punchedAt: Date; outsideBusinessHours: boolean };

export async function entriesOfDay(userId: string, date = new Date()) {
  const { start, end } = dayRange(date);
  return db.timeEntry.findMany({
    where: { userId, punchedAt: { gte: start, lt: end } },
    orderBy: { punchedAt: "asc" },
    include: { allowedLocation: { select: { name: true } } },
  });
}

/**
 * Registra uma batida. A hora é sempre a do servidor.
 * Validações na ordem: limite diário → exigências (localização, cerca, QR, selfie) → horário comercial.
 * Fora do horário comercial, devolve "needs-confirmation" até o usuário confirmar.
 */
export async function registerPunch(user: CurrentUser, input: PunchInput): Promise<PunchResult> {
  const now = new Date();
  const organization = await getOrganization();
  const requirements = await getRequirementsFor(user.id);

  const { start, end } = dayRange(now);
  const todayCount = await db.timeEntry.count({ where: { userId: user.id, punchedAt: { gte: start, lt: end } } });
  if (todayCount >= MAX_PUNCHES_PER_DAY) {
    throw new DomainError(`Limite de ${MAX_PUNCHES_PER_DAY} marcações por dia atingido. Solicite um ajuste se necessário.`);
  }

  const hasLocation =
    input.latitude !== null && input.longitude !== null && isValidCoordinate(input.latitude, input.longitude);
  if (requirements.geolocation && !hasLocation) {
    throw new DomainError("Permita o acesso à sua localização para registrar o ponto.");
  }

  let allowedLocationId: string | null = null;
  if (requirements.geofence) {
    const locations = await db.allowedLocation.findMany({ where: { active: true } });
    if (locations.length === 0) {
      throw new DomainError("Nenhum local permitido foi cadastrado. Avise o administrador.");
    }
    const { match, nearest } = matchLocation({ latitude: input.latitude!, longitude: input.longitude! }, locations);
    if (!match) {
      const distance = nearest ? Math.round(nearest.distance) : 0;
      throw new DomainError(
        `Você está fora dos locais permitidos (a ${distance.toLocaleString("pt-BR")} m de ${nearest?.location.name}).`,
      );
    }
    allowedLocationId = match.id;
  }

  let qrVerified = false;
  if (requirements.qrCode) {
    const secret = await getQrSecret();
    if (!input.qrToken || !verifyQrToken(secret, input.qrToken, now)) {
      throw new DomainError("QR code inválido ou expirado. Escaneie o QR code do painel novamente.");
    }
    qrVerified = true;
  }

  if (requirements.selfie) {
    if (!input.selfie || input.selfie.size === 0) throw new DomainError("Tire a selfie para registrar o ponto.");
    if (input.selfie.type !== "image/jpeg") throw new DomainError("Formato de selfie inválido.");
    if (input.selfie.size > SELFIE_MAX_BYTES) throw new DomainError("A selfie ficou grande demais. Tente novamente.");
  }

  // Com jornada atribuída, vale a jornada (com margem); sem jornada, o horário comercial da empresa.
  const window = await scheduleWindow(user.id, now);
  const outsideBusinessHours = window.hasSchedule
    ? !isWithinSchedule(now, window.intervals, organization.scheduleWarningMarginMinutes)
    : !isWithinBusinessHours(now, {
        start: organization.businessHoursStart,
        end: organization.businessHoursEnd,
        days: organization.businessDays,
      });
  if (outsideBusinessHours && !input.confirmOutsideHours) return { status: "needs-confirmation" };

  // Upload antes da transação para não segurar a trava do NSR durante a rede.
  const selfieKey = requirements.selfie
    ? await uploadPrivateFile(`selfies/${user.id}/${now.toISOString().replace(/[:.]/g, "-")}.jpg`, input.selfie!)
    : null;

  const h = await headers();
  const entry = await db.$transaction(async (tx) => {
    // Linha única travada até o commit: NSR sequencial e sem lacunas.
    const [{ value: nsr }] = await tx.$queryRaw<{ value: bigint }[]>`
      UPDATE "nsr_counter" SET "value" = "value" + 1 WHERE "id" = 1 RETURNING "value"`;

    // Reconfere o limite já com a trava: dois toques simultâneos não passam de 8.
    // Se falhar, o rollback desfaz também o incremento do NSR.
    const count = await tx.timeEntry.count({ where: { userId: user.id, punchedAt: { gte: start, lt: end } } });
    if (count >= MAX_PUNCHES_PER_DAY) {
      throw new DomainError(`Limite de ${MAX_PUNCHES_PER_DAY} marcações por dia atingido.`);
    }

    return tx.timeEntry.create({
      data: {
        nsr,
        userId: user.id,
        punchedAt: now,
        latitude: requirements.geolocation ? input.latitude : null,
        longitude: requirements.geolocation ? input.longitude : null,
        accuracyMeters: requirements.geolocation ? input.accuracyMeters : null,
        allowedLocationId,
        selfieKey,
        qrVerified,
        outsideBusinessHours,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
        userAgent: h.get("user-agent"),
      },
    });
  });

  return { status: "registered", nsr: entry.nsr, punchedAt: entry.punchedAt, outsideBusinessHours };
}
