import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EntriesByDay } from "@/components/timesheet/entries-by-day";
import { MonthNav } from "@/components/timesheet/month-nav";
import { buttonVariants } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/permissions";
import { dateKey, monthKey, parseMonthKey } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { canViewTimesheetOf } from "@/server/team";
import { approvedAdjustmentsInRange } from "@/server/adjustments";

export const metadata: Metadata = { title: "Ponto do funcionário" };

export default async function MemberTimesheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const viewer = await requirePermission("timesheet:team");
  const { id } = await params;
  // Fora do escopo responde como inexistente, sem revelar que o usuário existe.
  if (!(await canViewTimesheetOf(viewer, id))) notFound();

  const requested = (await searchParams).mes;
  const month = parseMonthKey(requested) ? requested! : monthKey(new Date());
  const range = parseMonthKey(month)!;

  const member = await db.user.findUnique({
    where: { id },
    select: {
      name: true,
      role: true,
      department: { select: { name: true } },
      timeEntries: {
        where: { punchedAt: { gte: range.start, lt: range.end } },
        orderBy: { punchedAt: "asc" },
        include: { allowedLocation: { select: { name: true } } },
      },
    },
  });
  if (!member) notFound();
  const firstDay = `${month}-01`;
  const lastDay = dateKey(new Date(range.end.getTime() - 1));
  const adjustments = await approvedAdjustmentsInRange(id, range.start, range.end, firstDay, lastDay);

  return (
    <>
      <Link href="/equipe" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2 -ml-2" })}>
        <ArrowLeftIcon /> Equipe
      </Link>
      <PageHeader
        title={member.name}
        description={[ROLE_LABELS[member.role], member.department?.name].filter(Boolean).join(" · ")}
      />
      <MonthNav month={month} basePath={`/equipe/${id}`} />
      <EntriesByDay entries={member.timeEntries} adjustments={adjustments} range={{ firstDay, lastDay }} />
    </>
  );
}
