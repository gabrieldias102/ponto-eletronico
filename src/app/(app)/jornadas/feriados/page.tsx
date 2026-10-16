import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { zonedParts } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { listHolidays } from "@/server/schedules";
import { AddHolidayForm, HolidayList } from "./holidays";

export const metadata: Metadata = { title: "Feriados" };

export default async function HolidaysPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  await requirePermission("schedules:manage");
  const current = zonedParts(new Date()).year;
  const requested = Number((await searchParams).ano);
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : current;
  const holidays = await listHolidays(year);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href={`?ano=${year - 1}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Ano anterior">
          <ChevronLeftIcon />
        </Link>
        <span className="min-w-16 text-center font-medium tabular-nums">{year}</span>
        <Link href={`?ano=${year + 1}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Próximo ano">
          <ChevronRightIcon />
        </Link>
      </div>
      <HolidayList holidays={holidays} year={year} />
      <AddHolidayForm year={year} />
    </div>
  );
}
