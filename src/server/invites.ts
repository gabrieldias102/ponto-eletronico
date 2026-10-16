import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { inviteEmail, sendEmail } from "@/server/email";
import { getOrganization } from "@/server/organization";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Envia o convite para o usuário definir a senha.
 *
 * O token segue o formato do reset de senha do Better Auth (`reset-password:<token>`),
 * então a tela /definir-senha usa o mesmo endpoint para o convite e para o "esqueci a senha".
 * O reset cria a conta de credencial quando o usuário ainda não tem senha.
 */
export async function sendInvite(user: { id: string; name: string; email: string }) {
  const token = randomBytes(24).toString("base64url");

  await db.verification.create({
    data: {
      id: randomUUID(),
      identifier: `reset-password:${token}`,
      value: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const organization = await getOrganization();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/definir-senha?token=${token}&convite=1`;

  await sendEmail({
    to: user.email,
    ...inviteEmail({ name: user.name, organization: organization.name, url }),
  });
}
