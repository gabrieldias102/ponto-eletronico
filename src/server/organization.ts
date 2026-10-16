import "server-only";
import { cache } from "react";
import { LOGO_MAX_BYTES, LOGO_TYPES, type OrganizationInput } from "@/lib/validation";
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { uploadPublicFile } from "@/server/storage";

export const ORGANIZATION_ID = "default";

/** Configuração da organização. Cria o registro padrão na primeira leitura. */
export const getOrganization = cache(async () => {
  return db.organization.upsert({
    where: { id: ORGANIZATION_ID },
    update: {},
    create: { id: ORGANIZATION_ID, name: "Minha Empresa" },
  });
});

type LogoChange = { file: File } | { remove: true } | null;

export async function updateOrganization(actor: CurrentUser, input: OrganizationInput, logo: LogoChange) {
  const current = await getOrganization();
  let logoUrl = current.logoUrl;

  if (logo && "file" in logo) {
    if (!LOGO_TYPES.includes(logo.file.type)) {
      throw new DomainError("Envie o logo em PNG, JPG ou WebP.", "logo");
    }
    if (logo.file.size > LOGO_MAX_BYTES) {
      throw new DomainError("O logo deve ter no máximo 1 MB.", "logo");
    }
    logoUrl = await uploadPublicFile("organization/logo", logo.file);
  } else if (logo && "remove" in logo) {
    logoUrl = null;
  }

  const data = { ...input, logoUrl };
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: ORGANIZATION_ID }, data });
    await audit(
      {
        actorId: actor.id,
        action: "organization.update",
        entity: "organization",
        entityId: ORGANIZATION_ID,
        before: {
          name: current.name,
          legalName: current.legalName,
          taxId: current.taxId,
          primaryColor: current.primaryColor,
          logoUrl: current.logoUrl,
        },
        after: data,
      },
      tx,
    );
  });
}
