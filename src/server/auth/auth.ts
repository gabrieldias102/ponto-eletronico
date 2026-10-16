import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { resetPasswordEmail, sendEmail } from "@/server/email";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Contas são criadas apenas pelo Administrador ou pelo RH.
    disableSignUp: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...resetPasswordEmail({ name: user.name, url }) });
    },
    // Vale para o convite (primeira senha) e para o "esqueci a senha".
    onPasswordReset: async ({ user }) => {
      await db.auditLog.create({
        data: { actorId: user.id, action: "auth.password_set", entity: "user", entityId: user.id },
      });
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false },
      active: { type: "boolean", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        // Usuários desativados não conseguem entrar.
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { active: true },
          });
          if (!user?.active) {
            throw new APIError("FORBIDDEN", { message: "Usuário desativado." });
          }
        },
        after: async (session) => {
          await db.auditLog.create({
            data: {
              actorId: session.userId,
              action: "auth.login",
              entity: "session",
              ip: session.ipAddress,
              userAgent: session.userAgent,
            },
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
