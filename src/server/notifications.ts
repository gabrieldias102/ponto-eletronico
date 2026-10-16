import "server-only";
import { baseUrl } from "@/server/base-url";
import { db } from "@/server/db";
import { notificationEmail, sendEmail } from "@/server/email";

type Message = { title: string; body: string; href: string };

/**
 * Cria notificações no sistema e envia por e-mail. O e-mail é best effort: falha no envio é registrada
 * no log, mas não desfaz a ação que gerou a notificação.
 */
export async function notify(userIds: string[], message: Message) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;

  await db.notification.createMany({ data: ids.map((userId) => ({ userId, ...message })) });

  const [users, base] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids }, active: true }, select: { name: true, email: true } }),
    baseUrl(),
  ]);
  await Promise.all(
    users.map((u) =>
      sendEmail({
        to: u.email,
        ...notificationEmail({ name: u.name, title: message.title, body: message.body, url: `${base}${message.href}` }),
      }).catch((error) => console.error(`[notificação] falha ao enviar e-mail para ${u.email}:`, error)),
    ),
  );
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

/** IDs dos usuários do RH ativos (aprovadores da segunda etapa). */
export async function hrUserIds() {
  const users = await db.user.findMany({ where: { role: "HR", active: true }, select: { id: true } });
  return users.map((u) => u.id);
}
