import type { Metadata } from "next";
import Link from "next/link";
import { Building2Icon, ClockIcon, UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { entriesOfDay } from "@/server/time-entries";
import { formatShortTime } from "@/lib/time";
import { MAX_PUNCHES_PER_DAY } from "@/lib/punch-rules";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  const showsUsers = can(user.role, "users:manage");
  const showsDepartments = can(user.role, "departments:manage");
  const punches = can(user.role, "punch:own");
  const [today, activeUsers, departments, departmentsWithoutManager] = await Promise.all([
    punches ? entriesOfDay(user.id) : [],
    showsUsers ? db.user.count({ where: { active: true } }) : 0,
    showsDepartments ? db.department.count() : 0,
    showsDepartments ? db.department.count({ where: { managerId: null } }) : 0,
  ]);

  return (
    <>
      <PageHeader title={`Olá, ${firstName}!`} description={`Você está como ${ROLE_LABELS[user.role]}.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {punches ? (
          <Link href="/ponto">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="size-4" /> Registrar ponto
                </CardTitle>
                <CardDescription>
                  Hoje: {today.length} de {MAX_PUNCHES_PER_DAY} marcações
                </CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold tabular-nums">
                {today.length > 0 ? `Última às ${formatShortTime(today.at(-1)!.punchedAt)}` : "Nenhuma ainda"}
              </CardContent>
            </Card>
          </Link>
        ) : null}

        {showsUsers ? (
          <Link href="/usuarios">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="size-4" /> Usuários
                </CardTitle>
                <CardDescription>Usuários ativos</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold tabular-nums">{activeUsers}</CardContent>
            </Card>
          </Link>
        ) : null}

        {showsDepartments ? (
          <Link href="/setores">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2Icon className="size-4" /> Setores
                </CardTitle>
                <CardDescription>
                  {departmentsWithoutManager > 0
                    ? `${departmentsWithoutManager} sem gestor`
                    : "Todos com gestor definido"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold tabular-nums">{departments}</CardContent>
            </Card>
          </Link>
        ) : null}
      </div>
    </>
  );
}
