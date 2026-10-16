import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/server/auth/session";
import { listDepartments } from "@/server/departments";

export const metadata: Metadata = { title: "Setores" };

export default async function DepartmentsPage() {
  await requirePermission("departments:manage");
  const departments = await listDepartments();

  return (
    <>
      <PageHeader
        title="Setores"
        description="Cada funcionário pertence a um setor, e o gestor do setor aprova os ajustes."
        actions={
          <Link href="/setores/novo" className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Novo setor
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setor</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead className="text-right">Funcionários</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  Nenhum setor cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/setores/${d.id}`} className="font-medium hover:underline">
                      {d.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {d.manager?.name ?? <span className="text-destructive">Sem gestor</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d._count.members}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
