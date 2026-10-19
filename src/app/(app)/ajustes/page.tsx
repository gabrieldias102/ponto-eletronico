import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { describeAdjustment } from "@/components/adjustments/describe";
import { StatusBadge } from "@/components/adjustments/status-badge";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import { requirePermission } from "@/server/auth/session";
import { listMyAdjustments } from "@/server/adjustments";

export const metadata: Metadata = { title: "Meus ajustes" };

export default async function MyAdjustmentsPage() {
  const user = await requirePermission("adjustment:request");
  const requests = await listMyAdjustments(user.id);

  return (
    <>
      <PageHeader
        title="Meus ajustes"
        description="Solicitações de inclusão, correção de marcação e abono."
        actions={
          <Link href="/ajustes/novo" className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Nova solicitação
          </Link>
        }
      />
      {requests.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Você ainda não fez solicitações.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {requests.map((r) => (
            <li key={r.id}>
              <Link href={`/ajustes/${r.id}`} className="flex flex-col gap-1 p-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium">{describeAdjustment(r)}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {formatDateTime(r.createdAt)}
                  <StatusBadge status={r.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
