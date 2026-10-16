import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

type AuditEntry = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

type Client = Pick<typeof db, "auditLog">;

/** Registra uma ação de auditoria. Aceita um cliente de transação para gravar junto da mudança. */
export async function audit(entry: AuditEntry, client: Client = db) {
  const h = await headers();
  await client.auditLog.create({
    data: {
      ...entry,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    },
  });
}
