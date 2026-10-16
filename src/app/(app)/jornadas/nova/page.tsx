import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { ScheduleForm } from "../schedule-form";

export const metadata: Metadata = { title: "Nova jornada" };

export default async function NewSchedulePage() {
  await requirePermission("schedules:manage");
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Nova jornada</h2>
      <ScheduleForm />
    </>
  );
}
