import type { Metadata } from "next";
import Link from "next/link";
import { HistoryIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EntriesByDay } from "@/components/timesheet/entries-by-day";
import { buttonVariants } from "@/components/ui/button";
import { MAX_PUNCHES_PER_DAY } from "@/lib/punch-rules";
import { formatLongDay } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { getOrganization } from "@/server/organization";
import { entriesOfDay, getRequirementsFor } from "@/server/time-entries";
import { scheduleWindow } from "@/server/schedules";
import { describePeriods } from "@/lib/schedule";
import { PunchPanel } from "./punch-panel";

export const metadata: Metadata = { title: "Registrar ponto" };

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function describeBusinessHours(start: string, end: string, days: number[]) {
  const sorted = [...days].sort();
  const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const dayText =
    sorted.length === 0
      ? "nenhum dia"
      : isRange && sorted.length > 2
        ? `${WEEKDAY_SHORT[sorted[0]]} a ${WEEKDAY_SHORT[sorted.at(-1)!]}`
        : sorted.map((d) => WEEKDAY_SHORT[d]).join(", ");
  return `${dayText}, ${start} às ${end}`;
}

export default async function PunchPage({ searchParams }: { searchParams: Promise<{ qr?: string }> }) {
  const user = await requirePermission("punch:own");
  const { qr } = await searchParams;
  const [requirements, today, organization, window] = await Promise.all([
    getRequirementsFor(user.id),
    entriesOfDay(user.id),
    getOrganization(),
    scheduleWindow(user.id, new Date()),
  ]);

  const hours = window.hasSchedule
    ? {
        kind: "schedule" as const,
        text:
          window.today.holiday && window.today.periods.length === 0
            ? `Feriado (${window.today.holiday})`
            : describePeriods(window.today.periods),
      }
    : {
        kind: "business" as const,
        text: describeBusinessHours(
          organization.businessHoursStart,
          organization.businessHoursEnd,
          organization.businessDays,
        ),
      };

  return (
    <>
      <PageHeader
        title="Registrar ponto"
        description={formatLongDay(new Date())}
        actions={
          <Link href="/ponto/historico" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <HistoryIcon /> Meu histórico
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <PunchPanel
          requirements={requirements}
          qrToken={qr?.slice(0, 64) ?? null}
          limitReached={today.length >= MAX_PUNCHES_PER_DAY}
          hours={hours}
        />

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Hoje · {today.length} de {MAX_PUNCHES_PER_DAY} marcações
          </h2>
          <EntriesByDay entries={today} detailed />
        </section>
      </div>
    </>
  );
}
