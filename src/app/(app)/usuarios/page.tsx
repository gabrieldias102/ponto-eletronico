import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/server/auth/session";
import { listUsers } from "@/server/users";
import { CreatedToast } from "./created-toast";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; criado?: string }>;
}) {
  await requirePermission("users:manage");
  const { q, criado } = await searchParams;
  const users = await listUsers(q);

  return (
    <>
      {criado ? <CreatedToast /> : null}
      <PageHeader
        title="Usuários"
        description="Pessoas com acesso ao sistema."
        actions={
          <Link href="/usuarios/novo" className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Novo usuário
          </Link>
        }
      />

      <form className="relative mb-4 max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="h-9 pl-8" />
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Perfil</TableHead>
              <TableHead className="hidden md:table-cell">Setor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/usuarios/${user.id}`} className="font-medium hover:underline">
                      {user.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{ROLE_LABELS[user.role]}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{ROLE_LABELS[user.role]}</TableCell>
                  <TableCell className="hidden md:table-cell">{user.department?.name ?? "—"}</TableCell>
                  <TableCell>
                    {!user.active ? (
                      <Badge variant="outline">Inativo</Badge>
                    ) : user.accounts.length === 0 ? (
                      <Badge variant="secondary">Convite pendente</Badge>
                    ) : (
                      <Badge>Ativo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
