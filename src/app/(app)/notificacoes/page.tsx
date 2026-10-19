import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { listNotifications } from "@/server/notifications";
import { MarkAllRead } from "./mark-read";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotifications(user.id);

  return (
    <>
      <MarkAllRead hasUnread={notifications.some((n) => !n.readAt)} />
      <PageHeader title="Notificações" />
      {notifications.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {notifications.map((n) => {
            const content = (
              <>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.readAt ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" /> : null}
                  {n.title}
                </span>
                <span className="text-sm text-muted-foreground">{n.body}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
              </>
            );
            return (
              <li key={n.id} className={cn(!n.readAt && "bg-primary/5")}>
                {n.href ? (
                  <Link href={n.href} className="flex flex-col gap-0.5 p-3 hover:bg-muted/50">
                    {content}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-0.5 p-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
