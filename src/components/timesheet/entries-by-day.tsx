import { CameraIcon, MapPinIcon, MoonIcon, QrCodeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNsr } from "@/lib/punch-rules";
import { dateKey, formatDay, formatShortTime, formatTime } from "@/lib/time";

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

function groupByDay(entries: EntryRow[]) {
  const days = new Map<string, EntryRow[]>();
  for (const entry of entries) {
    const key = dateKey(entry.punchedAt);
    days.set(key, [...(days.get(key) ?? []), entry]);
  }
  return [...days.entries()];
}

/** Marcações agrupadas por dia. Com `detailed`, mostra NSR, local, QR e selfie de cada batida. */
export function EntriesByDay({ entries, detailed = false }: { entries: EntryRow[]; detailed?: boolean }) {
  if (entries.length === 0) {
    return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nenhuma marcação no período.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {groupByDay(entries).map(([key, dayEntries]) => (
        <li key={key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4">
          <span className="w-28 shrink-0 text-sm font-medium">{formatDay(dayEntries[0].punchedAt)}</span>
          {detailed ? (
            <ul className="flex flex-1 flex-col gap-2">
              {dayEntries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium tabular-nums">{formatTime(e.punchedAt)}</span>
                  <span className="font-mono text-xs text-muted-foreground">NSR {formatNsr(e.nsr)}</span>
                  {e.outsideBusinessHours ? (
                    <Badge variant="outline" className="gap-1">
                      <MoonIcon className="size-3" /> Fora do horário
                    </Badge>
                  ) : null}
                  {e.latitude != null && e.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    >
                      <MapPinIcon className="size-3" />
                      {e.allowedLocation?.name ?? "Ver no mapa"}
                      {e.accuracyMeters != null ? ` (±${Math.round(e.accuracyMeters)} m)` : ""}
                    </a>
                  ) : null}
                  {e.qrVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <QrCodeIcon className="size-3" /> QR
                    </span>
                  ) : null}
                  {e.selfieKey ? (
                    <a
                      href={`/api/marcacoes/${e.id}/selfie`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    >
                      <CameraIcon className="size-3" /> Selfie
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <span className="flex flex-wrap gap-2">
              {dayEntries.map((e) => (
                <Badge
                  key={e.id}
                  variant={e.outsideBusinessHours ? "outline" : "secondary"}
                  className="tabular-nums"
                  title={`NSR ${formatNsr(e.nsr)}`}
                >
                  {formatShortTime(e.punchedAt)}
                </Badge>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
