import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EntriesByDay } from "@/components/timesheet/entries-by-day";
import { MonthNav } from "@/components/timesheet/month-nav";
import { monthKey, parseMonthKey } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Meu histórico" };

export default async function MyHistoryPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requirePermission("timesheet:own");
  const requested = (await searchParams).mes;
  const month = parseMonthKey(requested) ? requested! : monthKey(new Date());
  const range = parseMonthKey(month)!;

  const entries = await db.timeEntry.findMany({
    where: { userId: user.id, punchedAt: { gte: range.start, lt: range.end } },
    orderBy: { punchedAt: "asc" },
    include: { allowedLocation: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Meu histórico" description="Suas marcações de ponto." />
      <MonthNav month={month} basePath="/ponto/historico" />
      <EntriesByDay entries={entries} detailed />
    </>
  );
}
