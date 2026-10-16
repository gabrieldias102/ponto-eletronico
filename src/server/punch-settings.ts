import "server-only";
import { randomBytes } from "node:crypto";
import type { AllowedLocationInput, PunchSettingsInput } from "@/lib/validation";
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { getOrganization, ORGANIZATION_ID } from "@/server/organization";

export async function updatePunchSettings(actor: CurrentUser, input: PunchSettingsInput) {
  const current = await getOrganization();
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: ORGANIZATION_ID }, data: input });
    await audit(
      {
        actorId: actor.id,
        action: "punch_settings.update",
        entity: "organization",
        entityId: ORGANIZATION_ID,
        before: {
          punchRequireGeolocation: current.punchRequireGeolocation,
          punchRequireGeofence: current.punchRequireGeofence,
          punchRequireSelfie: current.punchRequireSelfie,
          punchRequireQrCode: current.punchRequireQrCode,
          businessHoursStart: current.businessHoursStart,
          businessHoursEnd: current.businessHoursEnd,
          businessDays: current.businessDays,
        },
        after: input,
      },
      tx,
    );
  });
}

export async function listAllowedLocations() {
  return db.allowedLocation.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { timeEntries: true } } },
  });
}

export async function createAllowedLocation(actor: CurrentUser, input: AllowedLocationInput) {
  await db.$transaction(async (tx) => {
    const location = await tx.allowedLocation.create({ data: input });
    await audit(
      { actorId: actor.id, action: "location.create", entity: "allowed_location", entityId: location.id, after: input },
      tx,
    );
  });
}

export async function setAllowedLocationActive(actor: CurrentUser, id: string, active: boolean) {
  await db.$transaction(async (tx) => {
    await tx.allowedLocation.update({ where: { id }, data: { active } });
    await audit(
      { actorId: actor.id, action: "location.update", entity: "allowed_location", entityId: id, after: { active } },
      tx,
    );
  });
}

/** Local com marcações não pode ser excluído (as marcações apontam para ele); desative-o. */
export async function deleteAllowedLocation(actor: CurrentUser, id: string) {
  const location = await db.allowedLocation.findUnique({
    where: { id },
    include: { _count: { select: { timeEntries: true } } },
  });
  if (!location) throw new DomainError("Local não encontrado.");
  if (location._count.timeEntries > 0) {
    throw new DomainError("Este local já tem marcações registradas. Desative-o em vez de excluir.");
  }
  await db.$transaction(async (tx) => {
    await tx.allowedLocation.delete({ where: { id } });
    await audit(
      {
        actorId: actor.id,
        action: "location.delete",
        entity: "allowed_location",
        entityId: id,
        before: { name: location.name, latitude: location.latitude, longitude: location.longitude },
      },
      tx,
    );
  });
}

/** Troca o segredo do QR code: o link e o QR do painel atual deixam de funcionar. */
export async function rotateQrSecret(actor: CurrentUser) {
  await db.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: ORGANIZATION_ID },
      data: { qrSecret: randomBytes(32).toString("base64url") },
    });
    await audit({ actorId: actor.id, action: "qr.rotate", entity: "organization", entityId: ORGANIZATION_ID }, tx);
  });
}

export async function updateAdjustmentSettings(
  actor: CurrentUser,
  input: { adjustmentRequireJustification: boolean; adjustmentRequireAttachment: boolean },
) {
  const current = await getOrganization();
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: ORGANIZATION_ID }, data: input });
    await audit(
      {
        actorId: actor.id,
        action: "adjustment_settings.update",
        entity: "organization",
        entityId: ORGANIZATION_ID,
        before: {
          adjustmentRequireJustification: current.adjustmentRequireJustification,
          adjustmentRequireAttachment: current.adjustmentRequireAttachment,
        },
        after: input,
      },
      tx,
    );
  });
}
