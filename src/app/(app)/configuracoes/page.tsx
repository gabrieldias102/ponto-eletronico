import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { getOrganization } from "@/server/organization";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  await requirePermission("settings:manage");
  const organization = await getOrganization();
  return <OrganizationForm organization={organization} />;
}
