import { AppShell } from "@/components/app-shell/app-shell";
import { navItemsFor } from "@/components/app-shell/nav";
import { isHexColor, readableForeground } from "@/lib/color";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/server/auth/session";
import { getOrganization } from "@/server/organization";
import { pendingCountForReviewer } from "@/server/adjustments";
import { unreadCount } from "@/server/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, organization] = await Promise.all([requireUser(), getOrganization()]);
  const [unread, pendingApprovals] = await Promise.all([unreadCount(user.id), pendingCountForReviewer(user)]);

  // Identidade visual da organização sobrescreve a cor padrão do Pontual.
  // Aplicada em :root para alcançar também menus e diálogos renderizados fora da árvore.
  const brandCss = isHexColor(organization.primaryColor)
    ? `:root{--primary:${organization.primaryColor};--primary-foreground:${readableForeground(organization.primaryColor)}}`
    : "";

  return (
    <>
      {brandCss ? <style>{brandCss}</style> : null}
      <AppShell
        items={navItemsFor(user.role, { "/aprovacoes": pendingApprovals })}
        unreadNotifications={unread}
        user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] }}
        organization={{ name: organization.name, logoUrl: organization.logoUrl }}
      >
        {children}
      </AppShell>
    </>
  );
}
