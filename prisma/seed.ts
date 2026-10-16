/**
 * Cria a organização padrão e o administrador inicial.
 * Uso: npm run db:seed (lê SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD do .env).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env");
  }

  await db.organization.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "Minha Empresa" },
  });

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.info(`Administrador ${email} já existe.`);
    return;
  }

  const admin = await db.user.create({
    data: { name: "Administrador", email, role: "ADMIN", emailVerified: true },
  });
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: admin.id,
      accountId: admin.id,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });

  console.info(`Administrador criado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
