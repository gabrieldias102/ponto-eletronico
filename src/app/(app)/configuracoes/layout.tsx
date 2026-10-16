import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/server/auth/session";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("settings:manage");
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsTabs />
      {children}
    </>
  );
}
