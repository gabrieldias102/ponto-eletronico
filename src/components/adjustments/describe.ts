import { TYPE_LABELS, type AdjustmentType } from "@/lib/adjustments";
import { formatShortTime } from "@/lib/time";

export function formatDateBr(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

type Describable = {
  type: AdjustmentType;
  date: string;
  endDate: string | null;
  requestedAt: Date | null;
  absenceStart: string | null;
  absenceEnd: string | null;
  timeEntry?: { punchedAt: Date } | null;
};

/** Resumo em uma linha: "Corrigir marcação · 16/10/2026 · 12:40 → 12:00". */
export function describeAdjustment(r: Describable): string {
  const parts = [TYPE_LABELS[r.type]];
  if (r.type === "ABSENCE") {
    parts.push(r.endDate && r.endDate !== r.date ? `${formatDateBr(r.date)} a ${formatDateBr(r.endDate)}` : formatDateBr(r.date));
    parts.push(r.absenceStart && r.absenceEnd ? `${r.absenceStart}–${r.absenceEnd}` : "dia inteiro");
  } else {
    parts.push(formatDateBr(r.date));
    const to = r.requestedAt ? formatShortTime(r.requestedAt) : "";
    parts.push(r.type === "CORRECTION" && r.timeEntry ? `${formatShortTime(r.timeEntry.punchedAt)} → ${to}` : to);
  }
  return parts.join(" · ");
}
