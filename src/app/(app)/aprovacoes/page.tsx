import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PaperclipIcon } from "lucide-react";
import { describeAdjustment } from "@/components/adjustments/describe";
import { StatusBadge } from "@/components/adjustments/status-badge";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/time";
import { decidedByReviewer, pendingForReviewer } from "@/server/adjustments";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Aprovações" };

type Row = Awaited<ReturnType<typeof pendingForReviewer>>[number];

function RequestList({ requests, empty }: { requests: Row[]; empty: string }) {
  if (requests.length === 0) {
    return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {requests.map((r) => (
        <li key={r.id}>
          <Link href={`/ajustes/${r.id}`} className="flex flex-col gap-1 p-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex flex-col">
              <span className="text-sm font-medium">
                {r.user.name}
                {r.user.department ? <span className="font-normal text-muted-foreground"> · {r.user.department.name}</span> : null}
              </span>
              <span className="flex items-center gap-1 text-sm">
                {describeAdjustment(r)}
                {r.attachmentKey ? <PaperclipIcon className="size-3.5 text-muted-foreground" aria-label="Com comprovante" /> : null}
              </span>
              {r.justification ? <span className="line-clamp-1 text-xs text-muted-foreground">{r.justification}</span> : null}
            </span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              {formatDateTime(r.createdAt)}
              <StatusBadge status={r.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const viewer = await requireUser();
  if (!can(viewer.role, "adjustment:review:manager") && !can(viewer.role, "adjustment:review:hr")) redirect("/inicio");
  const tab = (await searchParams).aba === "decididas" ? "decididas" : "pendentes";
  const requests = tab === "pendentes" ? await pendingForReviewer(viewer) : await decidedByReviewer(viewer.id);

  return (
    <>
      <PageHeader
        title="Aprovações"
        description={
          viewer.role === "MANAGER"
            ? "Ajustes dos setores que você gerencia (primeira etapa)."
            : viewer.role === "HR"
              ? "Ajustes aprovados pelos gestores, aguardando o RH."
              : "Ajustes pendentes nas duas etapas."
        }
      />
      <nav className="mb-4 flex gap-1 shadow-[inset_0_-1px_0_var(--border)]">
        {(
          [
            ["pendentes", "Pendentes"],
            ["decididas", "Decididas por mim"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "pendentes" ? "/aprovacoes" : "/aprovacoes?aba=decididas"}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === key ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <RequestList
        requests={requests}
        empty={tab === "pendentes" ? "Nenhum ajuste aguardando sua decisão." : "Você ainda não decidiu nenhum ajuste."}
      />
    </>
  );
}
