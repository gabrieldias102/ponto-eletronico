import Link from "next/link";
import { CameraIcon, FilePenLineIcon, MapPinIcon, MoonIcon, PlusIcon, QrCodeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { daysInRange, effectivePunches, type AdjustmentType } from "@/lib/adjustments";
import { formatNsr } from "@/lib/punch-rules";
import { dateKey, formatDay, formatShortTime, formatTime, parseDayKey } from "@/lib/time";
import { cn } from "@/lib/utils";

export type EntryRow = {
  id: string;
  nsr: bigint;
  punchedAt: Date;
  outsideBusinessHours: boolean;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  selfieKey?: string | null;
  qrVerified?: boolean;
  allowedLocation?: { name: string } | null;
};

/** Ajuste aprovado: inclusão/correção vira marcação tratada; abono aparece no(s) dia(s). */
export type ApprovedAdjustmentRow = {
  id: string;
  type: AdjustmentType;
  date: string;
  endDate: string | null;
  requestedAt: Date | null;
  timeEntryId: string | null;
  absenceStart: string | null;
  absenceEnd: string | null;
};

type Props = {
  entries: EntryRow[];
  adjustments?: ApprovedAdjustmentRow[];
  /** Limita os dias de abono mostrados ao período listado. */
  range?: { firstDay: string; lastDay: string };
  /** No histórico do próprio funcionário: atalhos para pedir correção e inclusão. */
  requestLinks?: boolean;
};

export function EntriesByDay({ entries, adjustments = [], range, requestLinks = false }: Props) {
  const days = new Set<string>(entries.map((e) => dateKey(e.punchedAt)));
  for (const a of adjustments) {
    if (a.requestedAt) days.add(dateKey(a.requestedAt));
    if (a.type === "ABSENCE") {
      for (const d of daysInRange(a.date, a.endDate ?? a.date)) {
        if (!range || (d >= range.firstDay && d <= range.lastDay)) days.add(d);
      }
    }
  }

  if (days.size === 0) {
    return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nenhuma marcação no período.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {[...days].sort().map((day) => {
        const { start, end } = parseDayKey(day)!;
        const dayEntries = entries.filter((e) => dateKey(e.punchedAt) === day);
        const dayAdjustments = adjustments.filter((a) => a.requestedAt && a.requestedAt >= start && a.requestedAt < end);
        const absences = adjustments.filter(
          (a) => a.type === "ABSENCE" && a.date <= day && (a.endDate ?? a.date) >= day,
        );
        const punches = effectivePunches(dayEntries, dayAdjustments);

        return (
          <li key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4">
            <span className="flex w-28 shrink-0 flex-col gap-1 text-sm font-medium">
              {formatDay(start)}
              {requestLinks ? (
                <Link
                  href={`/ajustes/novo?tipo=INCLUSION&data=${day}`}
                  className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:underline"
                >
                  <PlusIcon className="size-3" /> Incluir marcação
                </Link>
              ) : null}
            </span>
            <ul className="flex flex-1 flex-col gap-2">
              {absences.map((a) => (
                <li key={a.id}>
                  <Link href={`/ajustes/${a.id}`}>
                    <Badge className="border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                      {a.absenceStart && a.absenceEnd ? `Abono ${a.absenceStart}–${a.absenceEnd}` : "Dia abonado"}
                    </Badge>
                  </Link>
                </li>
              ))}
              {punches.map((p) =>
                p.kind === "adjustment" ? (
                  <li key={`adj-${p.requestId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium tabular-nums">{formatShortTime(p.at)}</span>
                    <Link href={`/ajustes/${p.requestId}`}>
                      <Badge variant="secondary" className="gap-1">
                        <FilePenLineIcon className="size-3" />
                        {p.type === "CORRECTION" ? "Corrigida por ajuste" : "Incluída por ajuste"}
                      </Badge>
                    </Link>
                  </li>
                ) : (
                  <li key={p.entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className={cn("font-medium tabular-nums", p.superseded && "text-muted-foreground line-through")}>
                      {formatTime(p.entry.punchedAt)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">NSR {formatNsr(p.entry.nsr)}</span>
                    {p.superseded ? <Badge variant="outline">Desconsiderada</Badge> : null}
                    {p.entry.outsideBusinessHours ? (
                      <Badge variant="outline" className="gap-1">
                        <MoonIcon className="size-3" /> Fora do horário
                      </Badge>
                    ) : null}
                    {p.entry.latitude != null && p.entry.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${p.entry.latitude},${p.entry.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        <MapPinIcon className="size-3" />
                        {p.entry.allowedLocation?.name ?? "Ver no mapa"}
                        {p.entry.accuracyMeters != null ? ` (±${Math.round(p.entry.accuracyMeters)} m)` : ""}
                      </a>
                    ) : null}
                    {p.entry.qrVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <QrCodeIcon className="size-3" /> QR
                      </span>
                    ) : null}
                    {p.entry.selfieKey ? (
                      <a
                        href={`/api/marcacoes/${p.entry.id}/selfie`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        <CameraIcon className="size-3" /> Selfie
                      </a>
                    ) : null}
                    {requestLinks && !p.superseded ? (
                      <Link
                        href={`/ajustes/novo?tipo=CORRECTION&data=${day}&marcacao=${p.entry.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Corrigir
                      </Link>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
