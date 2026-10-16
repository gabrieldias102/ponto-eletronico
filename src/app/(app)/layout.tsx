import { AppShell } from "@/components/app-shell/app-shell";
import { navItemsFor } from "@/components/app-shell/nav";
import { isHexColor, readableForeground } from "@/lib/color";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/server/auth/session";
import { getOrganization } from "@/server/organization";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, organization] = await Promise.all([requireUser(), getOrganization()]);

  // Identidade visual da organização sobrescreve a cor padrão do Pontual.
  // Aplicada em :root para alcançar também menus e diálogos renderizados fora da árvore.
  const brandCss = isHexColor(organization.primaryColor)
    ? `:root{--primary:${organization.primaryColor};--primary-foreground:${readableForeground(organization.primaryColor)}}`
    : "";

  return (
    <>
      {brandCss ? <style>{brandCss}</style> : null}
      <AppShell
        items={navItemsFor(user.role)}
        user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] }}
        organization={{ name: organization.name, logoUrl: organization.logoUrl }}
      >
        {children}
      </AppShell>
    </>
  );
}
