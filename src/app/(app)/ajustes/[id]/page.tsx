import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, PaperclipIcon, SendIcon, XIcon } from "lucide-react";
import { describeAdjustment } from "@/components/adjustments/describe";
import { StatusBadge } from "@/components/adjustments/status-badge";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isPending, reviewableStep, STEP_LABELS } from "@/lib/adjustments";
import { formatNsr } from "@/lib/punch-rules";
import { formatDateTime, formatTime } from "@/lib/time";
import { getAdjustmentFor } from "@/server/adjustments";
import { requireUser } from "@/server/auth/session";
import { CancelButton, ReviewForm } from "./request-actions";
import { SentToast } from "./sent-toast";

export const metadata: Metadata = { title: "Solicitação de ajuste" };

export default async function AdjustmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviado?: string }>;
}) {
  const viewer = await requireUser();
  const { id } = await params;
  const request = await getAdjustmentFor(viewer, id);
  if (!request) notFound();
  const { enviado } = await searchParams;

  const isRequester = request.userId === viewer.id;
  const step = reviewableStep(viewer, { status: request.status, departmentManagerId: request.user.department?.managerId ?? null });
  const canResubmit = isRequester && request.status === "REJECTED" && request.resubmissions.length === 0;

  return (
    <>
      {enviado ? <SentToast /> : null}
      <Link
        href={isRequester ? "/ajustes" : "/aprovacoes"}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2 -ml-2" })}
      >
        <ArrowLeftIcon /> {isRequester ? "Meus ajustes" : "Aprovações"}
      </Link>
      <PageHeader
        title={describeAdjustment(request)}
        description={isRequester ? undefined : `${request.user.name}${request.user.department ? ` · ${request.user.department.name}` : ""}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="grid max-w-3xl gap-6">
        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-[10rem_1fr]">
          {request.timeEntry ? (
            <>
              <dt className="text-muted-foreground">Marcação original</dt>
              <dd>
                {formatTime(request.timeEntry.punchedAt)}{" "}
                <span className="font-mono text-xs text-muted-foreground">NSR {formatNsr(request.timeEntry.nsr)}</span>
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Justificativa</dt>
          <dd className="whitespace-pre-wrap">{request.justification ?? "—"}</dd>
          <dt className="text-muted-foreground">Comprovante</dt>
          <dd>
            {request.attachmentKey ? (
              <a href={`/api/ajustes/${request.id}/anexo`} target="_blank" className="inline-flex items-center gap-1 underline">
                <PaperclipIcon className="size-3.5" /> {request.attachmentName ?? "Abrir"}
              </a>
            ) : (
              "—"
            )}
          </dd>
          {request.previousRequest ? (
            <>
              <dt className="text-muted-foreground">Reenvio de</dt>
              <dd>
                <Link href={`/ajustes/${request.previousRequest.id}`} className="underline">
                  solicitação rejeitada
                </Link>
              </dd>
            </>
          ) : null}
        </dl>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Histórico</h2>
          <ol className="flex flex-col gap-3 border-l pl-4">
            <li className="relative text-sm">
              <SendIcon className="absolute top-0.5 -left-[1.4rem] size-3.5 rounded-full bg-background text-muted-foreground" />
              Enviada em {formatDateTime(request.createdAt)}
            </li>
            {request.reviews.map((r) => (
              <li key={r.id} className="relative text-sm">
                {r.decision === "APPROVED" ? (
                  <CheckIcon className="absolute top-0.5 -left-[1.4rem] size-3.5 rounded-full bg-background text-emerald-600" />
                ) : (
                  <XIcon className="absolute top-0.5 -left-[1.4rem] size-3.5 rounded-full bg-background text-destructive" />
                )}
                {r.decision === "APPROVED" ? "Aprovada" : "Rejeitada"} por {r.reviewer.name} ({STEP_LABELS[r.step]}) em{" "}
                {formatDateTime(r.createdAt)}
                {r.comment ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">“{r.comment}”</p> : null}
              </li>
            ))}
            {request.status === "CANCELLED" && request.decidedAt ? (
              <li className="relative text-sm text-muted-foreground">Cancelada em {formatDateTime(request.decidedAt)}</li>
            ) : null}
          </ol>
        </section>

        {step ? <ReviewForm id={request.id} step={step} /> : null}

        <div className="flex flex-wrap gap-2">
          {isRequester && isPending(request.status) ? <CancelButton id={request.id} /> : null}
          {canResubmit ? (
            <Link href={`/ajustes/novo?reenviar=${request.id}`} className={buttonVariants({ size: "lg" })}>
              Reenviar com correções
            </Link>
          ) : null}
          {request.resubmissions[0] ? (
            <Link href={`/ajustes/${request.resubmissions[0].id}`} className={buttonVariants({ variant: "outline" })}>
              Ver reenvio
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
