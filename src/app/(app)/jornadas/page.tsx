import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes, weeklyMinutes } from "@/lib/schedule";
import { requirePermission } from "@/server/auth/session";
import { listSchedules, toDefinition } from "@/server/schedules";

export const metadata: Metadata = { title: "Jornadas" };

export default async function SchedulesPage() {
  await requirePermission("schedules:manage");
  const schedules = await listSchedules();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link href="/jornadas/nova" className={buttonVariants({ size: "lg" })}>
          <PlusIcon /> Nova jornada
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jornada</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="text-right">Carga semanal</TableHead>
              <TableHead className="text-right">Funcionários</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhuma jornada cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/jornadas/${s.id}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                    {!s.active ? (
                      <Badge variant="outline" className="ml-2">
                        Inativa
                      </Badge>
                    ) : null}
                    {s.description ? <p className="text-xs text-muted-foreground">{s.description}</p> : null}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {s.type === "WEEKLY" ? "Semanal" : `Ciclo de ${(s.days as unknown[]).length} dias`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutes(weeklyMinutes(toDefinition(s)))}
                    {s.type === "CYCLE" ? <span className="text-xs text-muted-foreground"> (média)</span> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.currentEmployees}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
