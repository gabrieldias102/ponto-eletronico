import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/server/auth/session";
import { getDepartment, managerOptions } from "@/server/departments";
import { DepartmentForm } from "../department-form";

export const metadata: Metadata = { title: "Editar setor" };

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("departments:manage");
  const { id } = await params;
  const [department, managers] = await Promise.all([getDepartment(id), managerOptions()]);
  if (!department) notFound();

  return (
    <>
      <PageHeader title={department.name} />
      <DepartmentForm
        department={{
          id: department.id,
          name: department.name,
          managerId: department.managerId,
          memberCount: department.members.length,
        }}
        managers={managers}
      />

      <section className="mt-10 max-w-xl">
        <h2 className="mb-3 text-lg font-semibold">Funcionários ({department.members.length})</h2>
        {department.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum funcionário neste setor.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {department.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <Link href={`/usuarios/${m.id}`} className="hover:underline">
                  {m.name}
                </Link>
                <span className="flex gap-2">
                  {!m.active ? <Badge variant="outline">Inativo</Badge> : null}
                  <span className="text-muted-foreground">{ROLE_LABELS[m.role]}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
