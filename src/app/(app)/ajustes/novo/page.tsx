import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import type { AdjustmentType } from "@/lib/adjustments";
import { formatShortTime, dateKey } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { getOrganization } from "@/server/organization";
import { AdjustmentForm, type AdjustmentDefaults } from "../adjustment-form";

export const metadata: Metadata = { title: "Nova solicitação" };

const TYPES: AdjustmentType[] = ["INCLUSION", "CORRECTION", "ABSENCE"];

export default async function NewAdjustmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; data?: string; marcacao?: string; reenviar?: string }>;
}) {
  const user = await requirePermission("adjustment:request");
  const params = await searchParams;
  const today = dateKey(new Date());
  const organization = await getOrganization();

  let defaults: AdjustmentDefaults = {
    type: TYPES.includes(params.tipo as AdjustmentType) ? (params.tipo as AdjustmentType) : "INCLUSION",
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.data ?? "") ? params.data! : today,
    timeEntryId: params.marcacao,
  };

  // Reenvio: preenche com os dados da solicitação rejeitada.
  if (params.reenviar) {
    const previous = await db.adjustmentRequest.findUnique({
      where: { id: params.reenviar },
      include: { _count: { select: { resubmissions: true } } },
    });
    if (previous && previous.userId === user.id && previous.status === "REJECTED" && previous._count.resubmissions === 0) {
      defaults = {
        type: previous.type,
        date: previous.date,
        endDate: previous.endDate ?? undefined,
        time: previous.requestedAt ? formatShortTime(previous.requestedAt) : undefined,
        timeEntryId: previous.timeEntryId ?? undefined,
        partial: Boolean(previous.absenceStart),
        absenceStart: previous.absenceStart ?? undefined,
        absenceEnd: previous.absenceEnd ?? undefined,
        justification: previous.justification ?? undefined,
        previousRequestId: previous.id,
      };
    }
  }

  return (
    <>
      <PageHeader
        title={defaults.previousRequestId ? "Reenviar solicitação" : "Nova solicitação"}
        description={defaults.previousRequestId ? "Ajuste o que for preciso e envie de novo." : undefined}
      />
      {defaults.previousRequestId ? (
        <p className="mb-4 text-sm">
          <Link href={`/ajustes/${defaults.previousRequestId}`} className="text-muted-foreground underline">
            Ver a solicitação rejeitada
          </Link>
        </p>
      ) : null}
      <AdjustmentForm
        defaults={defaults}
        today={today}
        requireJustification={organization.adjustmentRequireJustification}
        requireAttachment={organization.adjustmentRequireAttachment}
      />
    </>
  );
}
