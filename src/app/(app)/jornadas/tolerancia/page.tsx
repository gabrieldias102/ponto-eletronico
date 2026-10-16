import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { getOrganization } from "@/server/organization";
import { ToleranceForm } from "./tolerance-form";

export const metadata: Metadata = { title: "Tolerância" };

export default async function TolerancePage() {
  await requirePermission("schedules:manage");
  const organization = await getOrganization();
  return <ToleranceForm values={organization} />;
}
