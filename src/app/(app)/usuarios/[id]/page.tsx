import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { assignableRoles, canManageUser, ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/server/auth/session";
import { departmentOptions } from "@/server/departments";
import { getUser } from "@/server/users";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Editar usuário" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("users:manage");
  const { id } = await params;
  const [user, departments] = await Promise.all([getUser(id), departmentOptions()]);
  if (!user) notFound();

  if (!canManageUser(actor.role, user.role)) {
    return (
      <>
        <PageHeader title={user.name} description={ROLE_LABELS[user.role]} />
        <p className="text-sm text-muted-foreground">Você não tem permissão para editar este usuário.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title={user.name} description={user.email} />
      <UserForm
        user={{ ...user, hasPassword: user.accounts.length > 0 }}
        roles={assignableRoles(actor.role)}
        departments={departments}
        isSelf={user.id === actor.id}
      />
    </>
  );
}
