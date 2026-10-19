import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EntriesByDay } from "@/components/timesheet/entries-by-day";
import { MonthNav } from "@/components/timesheet/month-nav";
import { dateKey, monthKey, parseMonthKey } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { approvedAdjustmentsInRange } from "@/server/adjustments";

export const metadata: Metadata = { title: "Meu histórico" };

export default async function MyHistoryPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requirePermission("timesheet:own");
  const requested = (await searchParams).mes;
  const month = parseMonthKey(requested) ? requested! : monthKey(new Date());
  const range = parseMonthKey(month)!;

  const firstDay = `${month}-01`;
  const lastDay = dateKey(new Date(range.end.getTime() - 1));
  const [entries, adjustments] = await Promise.all([
    db.timeEntry.findMany({
      where: { userId: user.id, punchedAt: { gte: range.start, lt: range.end } },
      orderBy: { punchedAt: "asc" },
      include: { allowedLocation: { select: { name: true } } },
    }),
    approvedAdjustmentsInRange(user.id, range.start, range.end, firstDay, lastDay),
  ]);

  return (
    <>
      <PageHeader title="Meu histórico" description="Suas marcações de ponto." />
      <MonthNav month={month} basePath="/ponto/historico" />
      <EntriesByDay entries={entries} adjustments={adjustments} range={{ firstDay, lastDay }} requestLinks />
    </>
  );
}
