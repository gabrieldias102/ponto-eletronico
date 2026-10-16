import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/server/auth/session";
import { managerOptions } from "@/server/departments";
import { DepartmentForm } from "../department-form";

export const metadata: Metadata = { title: "Novo setor" };

export default async function NewDepartmentPage() {
  await requirePermission("departments:manage");
  const managers = await managerOptions();

  return (
    <>
      <PageHeader title="Novo setor" />
      <DepartmentForm managers={managers} />
    </>
  );
}
