import { can, type Role } from "@/lib/permissions";

export type AdjustmentType = "INCLUSION" | "CORRECTION" | "ABSENCE";
export type AdjustmentStatus = "PENDING_MANAGER" | "PENDING_HR" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ReviewStep = "MANAGER" | "HR";
export type ReviewDecision = "APPROVED" | "REJECTED";

export const TYPE_LABELS: Record<AdjustmentType, string> = {
  INCLUSION: "Incluir marcação",
  CORRECTION: "Corrigir marcação",
  ABSENCE: "Abono",
};

export const STATUS_LABELS: Record<AdjustmentStatus, string> = {
  PENDING_MANAGER: "Aguardando gestor",
  PENDING_HR: "Aguardando RH",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
};

export const STEP_LABELS: Record<ReviewStep, string> = { MANAGER: "Gestor", HR: "RH" };

export function isPending(status: AdjustmentStatus): boolean {
  return status === "PENDING_MANAGER" || status === "PENDING_HR";
}

/** Primeira etapa: gestor do setor; sem gestor, vai direto ao RH. */
export function initialStatus(hasManager: boolean): AdjustmentStatus {
  return hasManager ? "PENDING_MANAGER" : "PENDING_HR";
}

export function stepOf(status: AdjustmentStatus): ReviewStep | null {
  if (status === "PENDING_MANAGER") return "MANAGER";
  if (status === "PENDING_HR") return "HR";
  return null;
}

/** Status depois da decisão: aprovação do gestor segue para o RH; aprovação do RH encerra. */
export function statusAfter(step: ReviewStep, decision: ReviewDecision): AdjustmentStatus {
  if (decision === "REJECTED") return "REJECTED";
  return step === "MANAGER" ? "PENDING_HR" : "APPROVED";
}

/**
 * Etapa que `viewer` pode decidir nesta solicitação, ou null.
 * Gestor: só o gestor do setor do solicitante (ou o Admin). RH: perfil com aprovação de RH (RH ou Admin).
 * Autoaprovação não é bloqueada por enquanto (decisão registrada em docs/requisitos.md).
 */
export function reviewableStep(
  viewer: { id: string; role: Role },
  request: { status: AdjustmentStatus; departmentManagerId: string | null },
): ReviewStep | null {
  const step = stepOf(request.status);
  if (step === "MANAGER") {
    const isDepartmentManager = request.departmentManagerId === viewer.id && can(viewer.role, "adjustment:review:manager");
    return viewer.role === "ADMIN" || isDepartmentManager ? "MANAGER" : null;
  }
  if (step === "HR") return can(viewer.role, "adjustment:review:hr") ? "HR" : null;
  return null;
}

// ---------------------------------------------------------------------------
// Marcações efetivas (tratamento)
// ---------------------------------------------------------------------------

type Entry = { id: string; punchedAt: Date };
type ApprovedAdjustment = {
  id: string;
  type: AdjustmentType;
  requestedAt: Date | null;
  timeEntryId: string | null;
};

export type EffectivePunch<E extends Entry> =
  | { kind: "entry"; at: Date; entry: E; superseded: boolean }
  | { kind: "adjustment"; at: Date; requestId: string; type: "INCLUSION" | "CORRECTION" };

/**
 * Junta marcações originais e ajustes aprovados, em ordem de horário.
 * Marcação corrigida continua na lista com `superseded: true` (nunca some), e o horário correto entra como ajuste.
 */
export function effectivePunches<E extends Entry>(entries: E[], approved: ApprovedAdjustment[]): EffectivePunch<E>[] {
  const superseded = new Set(approved.filter((a) => a.type === "CORRECTION" && a.timeEntryId).map((a) => a.timeEntryId!));
  const list: EffectivePunch<E>[] = entries.map((entry) => ({
    kind: "entry",
    at: entry.punchedAt,
    entry,
    superseded: superseded.has(entry.id),
  }));
  for (const a of approved) {
    if ((a.type === "INCLUSION" || a.type === "CORRECTION") && a.requestedAt) {
      list.push({ kind: "adjustment", at: a.requestedAt, requestId: a.id, type: a.type });
    }
  }
  return list.sort((x, y) => x.at.getTime() - y.at.getTime());
}

/** Quantas marcações valem no dia (originais não corrigidas + ajustes). */
export function countEffective(punches: EffectivePunch<Entry>[]): number {
  return punches.filter((p) => p.kind === "adjustment" || !p.superseded).length;
}

/** Dias "YYYY-MM-DD" de `from` a `to` (inclusive). */
export function daysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (let i = 0; i < 366; i++) {
    const key = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (key > to) break;
    days.push(key);
  }
  return days;
}
