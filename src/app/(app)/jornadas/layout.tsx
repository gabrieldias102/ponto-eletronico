import { PageHeader } from "@/components/page-header";
import { PageTabs } from "@/components/page-tabs";
import { requirePermission } from "@/server/auth/session";

const TABS = [
  { href: "/jornadas", label: "Jornadas" },
  { href: "/jornadas/feriados", label: "Feriados" },
  { href: "/jornadas/tolerancia", label: "Tolerância" },
];

export default async function SchedulesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("schedules:manage");
  return (
    <>
      <PageHeader title="Jornadas" description="Horários de trabalho, feriados e tolerância." />
      <PageTabs tabs={TABS} />
      {children}
    </>
  );
}
