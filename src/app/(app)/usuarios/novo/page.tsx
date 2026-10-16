import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { assignableRoles } from "@/lib/permissions";
import { requirePermission } from "@/server/auth/session";
import { departmentOptions } from "@/server/departments";
import { getOrganization } from "@/server/organization";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NewUserPage() {
  const actor = await requirePermission("users:manage");
  const [departments, organization] = await Promise.all([departmentOptions(), getOrganization()]);

  return (
    <>
      <PageHeader title="Novo usuário" />
      {departments.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Nenhum setor cadastrado ainda. Todos que batem ponto precisam de um setor.
        </p>
      ) : null}
      <UserForm roles={assignableRoles(actor.role)} departments={departments} punchDefaults={organization} />
    </>
  );
}
