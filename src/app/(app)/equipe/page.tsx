import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/form";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { dateKey, formatLongDay, formatShortTime, parseDayKey } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { departmentOptions } from "@/server/departments";
import { teamScope } from "@/server/team";

export const metadata: Metadata = { title: "Ponto da equipe" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; setor?: string }>;
}) {
  const viewer = await requirePermission("timesheet:team");
  const scope = teamScope(viewer);
  if (!scope) redirect("/inicio");

  const params = await searchParams;
  const today = dateKey(new Date());
  const day = parseDayKey(params.data) && params.data! <= today ? params.data! : today;
  const range = parseDayKey(day)!;
  const seesAll = can(viewer.role, "timesheet:all");
  const departmentId = seesAll ? params.setor || undefined : undefined;

  const [members, departments] = await Promise.all([
    db.user.findMany({
      where: { AND: [scope, { active: true }, departmentId ? { departmentId } : {}] },
      select: {
        id: true,
        name: true,
        role: true,
        department: { select: { name: true } },
        timeEntries: {
          where: { punchedAt: { gte: range.start, lt: range.end } },
          orderBy: { punchedAt: "asc" },
          select: { id: true, punchedAt: true, outsideBusinessHours: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    seesAll ? departmentOptions() : Promise.resolve([]),
  ]);

  // Marcações ímpares = jornada em aberto (entrou e ainda não saiu).
  const working = members.filter((m) => m.timeEntries.length % 2 === 1).length;
  const withoutPunch = members.filter((m) => m.timeEntries.length === 0).length;

  return (
    <>
      <PageHeader
        title="Ponto da equipe"
        description={seesAll ? "Marcações de todos os funcionários." : "Marcações dos setores que você gerencia."}
      />

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Dia
          <Input type="date" name="data" defaultValue={day} max={today} className="h-9 w-44" />
        </label>
        {seesAll ? (
          <label className="flex flex-col gap-1 text-sm">
            Setor
            <NativeSelect name="setor" defaultValue={departmentId ?? ""} className="w-48">
              <option value="">Todos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <button type="submit" className="h-9 rounded-lg border px-3 text-sm hover:bg-muted">
          Filtrar
        </button>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        <span>{formatLongDay(range.start)}</span>
        {day === today ? ` · ${working} em jornada agora` : ""} · {withoutPunch} sem marcação
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead className="hidden md:table-cell">Setor</TableHead>
              <TableHead>Marcações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  Nenhum funcionário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/equipe/${m.id}?mes=${day.slice(0, 7)}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{m.department?.name ?? "—"}</TableCell>
                  <TableCell>
                    {m.timeEntries.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {m.timeEntries.map((e) => (
                          <Badge key={e.id} variant={e.outsideBusinessHours ? "outline" : "secondary"} className="tabular-nums">
                            {formatShortTime(e.punchedAt)}
                          </Badge>
                        ))}
                      </span>
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
