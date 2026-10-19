import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import {
  countEffective,
  effectivePunches,
  initialStatus,
  isPending,
  reviewableStep,
  statusAfter,
  TYPE_LABELS,
  type ReviewDecision,
} from "@/lib/adjustments";
import { MAX_PUNCHES_PER_DAY } from "@/lib/punch-rules";
import { addDays } from "@/lib/schedule";
import { dateKey, parseDayKey, zonedToUtc } from "@/lib/time";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, type AdjustmentInput } from "@/lib/validation";
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { hrUserIds, notify } from "@/server/notifications";
import { getOrganization } from "@/server/organization";
import { uploadPrivateFile } from "@/server/storage";
import { canViewTimesheetOf } from "@/server/team";

/** Abono pode ser pedido com antecedência (ex.: consulta marcada); inclusão e correção, não. */
const ABSENCE_MAX_DAYS_AHEAD = 60;
const ABSENCE_MAX_DAYS = 31;

function localInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return zonedToUtc(y, m, d, h, mi);
}

function formatDateBr(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

/** Marcações e ajustes aprovados/pendentes do dia, para validar o limite de 8. */
async function dayLoad(userId: string, date: string) {
  const range = parseDayKey(date)!;
  const [entries, adjustments] = await Promise.all([
    db.timeEntry.findMany({ where: { userId, punchedAt: { gte: range.start, lt: range.end } }, select: { id: true, punchedAt: true } }),
    db.adjustmentRequest.findMany({
      where: {
        userId,
        type: { in: ["INCLUSION", "CORRECTION"] },
        status: { in: ["PENDING_MANAGER", "PENDING_HR", "APPROVED"] },
        requestedAt: { gte: range.start, lt: range.end },
      },
      select: { id: true, type: true, requestedAt: true, timeEntryId: true },
    }),
  ]);
  return countEffective(effectivePunches(entries, adjustments));
}

export async function createAdjustment(
  user: CurrentUser,
  input: AdjustmentInput,
  attachment: File | null,
  previousRequestId: string | null,
) {
  const organization = await getOrganization();
  const now = new Date();
  const today = dateKey(now);

  if (organization.adjustmentRequireJustification && !input.justification) {
    throw new DomainError("Informe a justificativa.", "justification");
  }
  const hasAttachment = attachment !== null && attachment.size > 0;
  if (organization.adjustmentRequireAttachment && !hasAttachment) {
    throw new DomainError("Anexe um comprovante.", "attachment");
  }
  if (hasAttachment) {
    if (!ATTACHMENT_TYPES.includes(attachment.type)) throw new DomainError("Anexe uma imagem (JPG, PNG, WebP) ou PDF.", "attachment");
    if (attachment.size > ATTACHMENT_MAX_BYTES) throw new DomainError("O anexo deve ter no máximo 5 MB.", "attachment");
  }

  let requestedAt: Date | null = null;
  let timeEntryId: string | null = null;

  if (input.type === "INCLUSION" || input.type === "CORRECTION") {
    requestedAt = localInstant(input.date, input.time);
    if (requestedAt > now) throw new DomainError("Não é possível pedir ajuste para um horário futuro.", "time");
  }

  if (input.type === "CORRECTION") {
    const entry = await db.timeEntry.findUnique({ where: { id: input.timeEntryId } });
    if (!entry || entry.userId !== user.id || dateKey(entry.punchedAt) !== input.date) {
      throw new DomainError("Marcação não encontrada neste dia.", "timeEntryId");
    }
    const existing = await db.adjustmentRequest.count({
      where: { timeEntryId: entry.id, status: { in: ["PENDING_MANAGER", "PENDING_HR", "APPROVED"] } },
    });
    if (existing > 0) throw new DomainError("Já existe uma correção para esta marcação.", "timeEntryId");
    timeEntryId = entry.id;
  }

  if (input.type === "INCLUSION" && (await dayLoad(user.id, input.date)) >= MAX_PUNCHES_PER_DAY) {
    throw new DomainError(`O dia já tem ${MAX_PUNCHES_PER_DAY} marcações (contando ajustes pendentes).`, "date");
  }

  if (input.type === "ABSENCE") {
    if (input.date > addDays(today, ABSENCE_MAX_DAYS_AHEAD)) {
      throw new DomainError(`O abono pode ser pedido com até ${ABSENCE_MAX_DAYS_AHEAD} dias de antecedência.`, "date");
    }
    const [y1, m1, d1] = input.date.split("-").map(Number);
    const [y2, m2, d2] = input.endDate.split("-").map(Number);
    const days = (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000 + 1;
    if (days > ABSENCE_MAX_DAYS) throw new DomainError(`Um abono pode ter no máximo ${ABSENCE_MAX_DAYS} dias.`, "endDate");
  }

  if (previousRequestId) {
    const previous = await db.adjustmentRequest.findUnique({
      where: { id: previousRequestId },
      include: { _count: { select: { resubmissions: true } } },
    });
    if (!previous || previous.userId !== user.id || previous.status !== "REJECTED" || previous._count.resubmissions > 0) {
      throw new DomainError("Esta solicitação não pode ser reenviada.");
    }
  }

  const requester = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { department: { select: { managerId: true } } },
  });
  const managerId = requester.department?.managerId ?? null;
  const status = initialStatus(managerId !== null);

  const attachmentKey = hasAttachment
    ? await uploadPrivateFile(`ajustes/${user.id}/${now.toISOString().replace(/[:.]/g, "-")}-${attachment.name}`, attachment)
    : null;

  const data: Prisma.AdjustmentRequestUncheckedCreateInput = {
    userId: user.id,
    type: input.type,
    status,
    date: input.date,
    endDate: input.type === "ABSENCE" ? input.endDate : null,
    requestedAt,
    timeEntryId,
    absenceStart: input.type === "ABSENCE" && input.partial ? input.absenceStart : null,
    absenceEnd: input.type === "ABSENCE" && input.partial ? input.absenceEnd : null,
    justification: input.justification,
    attachmentKey,
    attachmentName: hasAttachment ? attachment.name.slice(0, 200) : null,
    attachmentType: hasAttachment ? attachment.type : null,
    previousRequestId,
  };

  const request = await db.$transaction(async (tx) => {
    const created = await tx.adjustmentRequest.create({ data });
    const after = { ...data, requestedAt: requestedAt?.toISOString() ?? null } as Prisma.InputJsonObject;
    await audit({ actorId: user.id, action: "adjustment.create", entity: "adjustment", entityId: created.id, after }, tx);
    return created;
  });

  const recipients = status === "PENDING_MANAGER" ? [managerId!] : await hrUserIds();
  await notify(recipients, {
    title: "Nova solicitação de ajuste",
    body: `${user.name} pediu: ${TYPE_LABELS[input.type].toLowerCase()} em ${formatDateBr(input.date)}.`,
    href: `/ajustes/${request.id}`,
  });

  return request;
}

export async function cancelAdjustment(user: CurrentUser, id: string) {
  const request = await db.adjustmentRequest.findUnique({ where: { id } });
  if (!request || request.userId !== user.id) throw new DomainError("Solicitação não encontrada.");
  if (!isPending(request.status)) throw new DomainError("Só é possível cancelar solicitações pendentes.");

  await db.$transaction(async (tx) => {
    const { count } = await tx.adjustmentRequest.updateMany({
      where: { id, status: request.status },
      data: { status: "CANCELLED", decidedAt: new Date() },
    });
    if (count === 0) throw new DomainError("A solicitação mudou de status. Atualize a página.");
    await audit({ actorId: user.id, action: "adjustment.cancel", entity: "adjustment", entityId: id }, tx);
  });
}

async function loadForReview(id: string) {
  return db.adjustmentRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, department: { select: { managerId: true } } } } },
  });
}

export async function reviewAdjustment(viewer: CurrentUser, id: string, decision: ReviewDecision, comment: string | null) {
  const request = await loadForReview(id);
  if (!request) throw new DomainError("Solicitação não encontrada.");
  const step = reviewableStep(viewer, {
    status: request.status,
    departmentManagerId: request.user.department?.managerId ?? null,
  });
  if (!step) throw new DomainError("Você não pode decidir esta solicitação agora.");
  if (decision === "REJECTED" && !comment) throw new DomainError("Explique o motivo da rejeição.", "comment");

  const next = statusAfter(step, decision);
  await db.$transaction(async (tx) => {
    // Só decide se o status ainda for o mesmo (duas pessoas decidindo ao mesmo tempo).
    const { count } = await tx.adjustmentRequest.updateMany({
      where: { id, status: request.status },
      data: { status: next, decidedAt: next === "PENDING_HR" ? null : new Date() },
    });
    if (count === 0) throw new DomainError("Esta solicitação já foi decidida por outra pessoa. Atualize a página.");
    await tx.adjustmentReview.create({ data: { requestId: id, step, reviewerId: viewer.id, decision, comment } });
    await audit(
      { actorId: viewer.id, action: `adjustment.${decision === "APPROVED" ? "approve" : "reject"}`, entity: "adjustment", entityId: id, after: { step, comment, status: next } },
      tx,
    );
  });

  const what = `${TYPE_LABELS[request.type].toLowerCase()} em ${formatDateBr(request.date)}`;
  const href = `/ajustes/${id}`;
  if (next === "REJECTED") {
    await notify([request.userId], { title: "Ajuste rejeitado", body: `Sua solicitação (${what}) foi rejeitada: ${comment}`, href });
  } else if (next === "PENDING_HR") {
    await notify([request.userId], { title: "Ajuste aprovado pelo gestor", body: `Sua solicitação (${what}) segue para o RH.`, href });
    await notify(await hrUserIds(), { title: "Ajuste aguardando o RH", body: `${request.user.name}: ${what}, aprovado pelo gestor.`, href });
  } else {
    await notify([request.userId], { title: "Ajuste aprovado", body: `Sua solicitação (${what}) foi aprovada.`, href });
  }
}

const requestInclude = {
  user: { select: { id: true, name: true, department: { select: { name: true, managerId: true } } } },
  timeEntry: { select: { id: true, punchedAt: true, nsr: true } },
  reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
  previousRequest: { select: { id: true } },
  resubmissions: { select: { id: true } },
} satisfies Prisma.AdjustmentRequestInclude;

export async function listMyAdjustments(userId: string) {
  return db.adjustmentRequest.findMany({ where: { userId }, include: requestInclude, orderBy: { createdAt: "desc" }, take: 100 });
}

/** Solicitação com checagem de acesso: o solicitante e quem pode ver o ponto dele (gestor, RH, Admin). */
export async function getAdjustmentFor(viewer: CurrentUser, id: string) {
  const request = await db.adjustmentRequest.findUnique({ where: { id }, include: requestInclude });
  if (!request) return null;
  if (request.userId !== viewer.id && !(await canViewTimesheetOf(viewer, request.userId))) return null;
  return request;
}

/** Fila do aprovador: etapa do gestor nos setores que gerencia; etapa do RH para RH; Admin vê as duas. */
export async function pendingForReviewer(viewer: CurrentUser) {
  const or: Prisma.AdjustmentRequestWhereInput[] = [];
  if (viewer.role === "ADMIN") or.push({ status: "PENDING_MANAGER" });
  else if (viewer.role === "MANAGER") or.push({ status: "PENDING_MANAGER", user: { department: { managerId: viewer.id } } });
  if (viewer.role === "ADMIN" || viewer.role === "HR") or.push({ status: "PENDING_HR" });
  if (or.length === 0) return [];
  return db.adjustmentRequest.findMany({ where: { OR: or }, include: requestInclude, orderBy: { createdAt: "asc" } });
}

export async function pendingCountForReviewer(viewer: CurrentUser) {
  if (!["ADMIN", "HR", "MANAGER"].includes(viewer.role)) return 0;
  return (await pendingForReviewer(viewer)).length;
}

export async function decidedByReviewer(viewerId: string) {
  return db.adjustmentRequest.findMany({
    where: { reviews: { some: { reviewerId: viewerId } } },
    include: requestInclude,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

/** Ajustes aprovados que tocam o período, para montar as marcações efetivas e os abonos. */
export async function approvedAdjustmentsInRange(userId: string, start: Date, end: Date, firstDay: string, lastDay: string) {
  return db.adjustmentRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      OR: [
        { requestedAt: { gte: start, lt: end } },
        { type: "ABSENCE", date: { lte: lastDay }, endDate: { gte: firstDay } },
      ],
    },
    select: {
      id: true,
      type: true,
      date: true,
      endDate: true,
      requestedAt: true,
      timeEntryId: true,
      absenceStart: true,
      absenceEnd: true,
    },
  });
}
