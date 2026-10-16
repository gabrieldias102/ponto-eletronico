import { PageHeader } from "@/components/page-header";
import { PageTabs } from "@/components/page-tabs";
import { requirePermission } from "@/server/auth/session";

const TABS = [
  { href: "/configuracoes", label: "Empresa" },
  { href: "/configuracoes/ponto", label: "Registro de ponto" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("settings:manage");
  return (
    <>
      <PageHeader title="Configurações" />
      <PageTabs tabs={TABS} />
      {children}
    </>
  );
}
