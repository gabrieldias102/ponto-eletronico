import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CycleDays, WeeklyDays } from "@/lib/schedule";
import { requirePermission } from "@/server/auth/session";
import { getSchedule } from "@/server/schedules";
import { ScheduleForm } from "../schedule-form";

export const metadata: Metadata = { title: "Editar jornada" };

export default async function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("schedules:manage");
  const schedule = await getSchedule((await params).id);
  if (!schedule) notFound();

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">{schedule.name}</h2>
      <ScheduleForm
        key={schedule.id}
        schedule={{
          id: schedule.id,
          name: schedule.name,
          description: schedule.description,
          type: schedule.type,
          days: schedule.days as WeeklyDays | CycleDays,
          cycleStartDate: schedule.cycleStartDate,
          worksOnHolidays: schedule.worksOnHolidays,
          active: schedule.active,
          inUse: schedule.inUse,
        }}
      />
    </>
  );
}
