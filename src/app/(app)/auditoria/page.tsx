import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Auditoria" };

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Entrou no sistema",
  "auth.password_set": "Definiu a senha",
  "user.create": "Cadastrou usuário",
  "user.update": "Alterou usuário",
  "user.invite": "Reenviou convite",
  "department.create": "Criou setor",
  "department.update": "Alterou setor",
  "department.delete": "Excluiu setor",
  "organization.update": "Alterou configurações",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await requirePermission("audit:view");
  const page = Math.max(1, Number((await searchParams).pagina) || 1);

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Auditoria" description="Registro das ações realizadas no sistema." />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead className="hidden md:table-cell">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum registro.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>{log.actor?.name ?? "Sistema"}</TableCell>
                  <TableCell>{ACTION_LABELS[log.action] ?? log.action}</TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{log.ip ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`?pagina=${page - 1}`} className={buttonVariants({ variant: "outline" })}>
                Anterior
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={`?pagina=${page + 1}`} className={buttonVariants({ variant: "outline" })}>
                Próxima
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
