"use client";

import { useState, useTransition } from "react";
import { CopyIcon, LockIcon, MoonIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Field, SubmitButton, useServerForm } from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crossesMidnight,
  dayMinutes,
  formatMinutes,
  MAX_PERIODS_PER_DAY,
  WEEKDAY_NAMES,
  weeklyMinutes,
  type CycleDays,
  type Period,
  type WeeklyDays,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { deleteScheduleAction, duplicateScheduleAction, saveSchedule } from "./actions";

type Schedule = {
  id: string;
  name: string;
  description: string | null;
  type: "WEEKLY" | "CYCLE";
  days: WeeklyDays | CycleDays;
  cycleStartDate: string | null;
  worksOnHolidays: boolean;
  active: boolean;
  inUse: boolean;
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro

const COMMERCIAL: Period[] = [
  { start: "08:00", end: "12:00" },
  { start: "13:00", end: "17:48" },
];

const CYCLE_PRESETS: { label: string; days: CycleDays; worksOnHolidays: boolean }[] = [
  { label: "12x36 diurno", days: [[{ start: "07:00", end: "19:00" }], []], worksOnHolidays: true },
  { label: "12x36 noturno", days: [[{ start: "19:00", end: "07:00" }], []], worksOnHolidays: true },
  { label: "24x48", days: [[{ start: "07:00", end: "07:00" }], [], []], worksOnHolidays: true },
  {
    label: "6x1",
    days: [...Array.from({ length: 6 }, () => [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "15:20" }]), []],
    worksOnHolidays: false,
  },
];

function PeriodsEditor({
  periods,
  onChange,
  disabled,
}: {
  periods: Period[];
  onChange: (periods: Period[]) => void;
  disabled: boolean;
}) {
  const update = (i: number, patch: Partial<Period>) => onChange(periods.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-2">
      {periods.length === 0 ? <span className="py-1.5 text-sm text-muted-foreground">Folga</span> : null}
      {periods.map((p, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input
            type="time"
            value={p.start}
            onChange={(e) => update(i, { start: e.target.value })}
            disabled={disabled}
            className="h-8 w-28"
            aria-label={`Início do período ${i + 1}`}
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="time"
            value={p.end}
            onChange={(e) => update(i, { end: e.target.value })}
            disabled={disabled}
            className="h-8 w-28"
            aria-label={`Término do período ${i + 1}`}
          />
          {p.start && p.end && crossesMidnight(p) ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Termina no dia seguinte">
              <MoonIcon className="size-3" /> dia seguinte
            </span>
          ) : null}
          {!disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(periods.filter((_, j) => j !== i))}
              aria-label="Remover período"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      ))}
      {!disabled && periods.length < MAX_PERIODS_PER_DAY ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => {
            const last = periods.at(-1);
            onChange([...periods, last ? { start: last.end, end: last.end } : { start: "08:00", end: "12:00" }]);
          }}
        >
          <PlusIcon /> Período
        </Button>
      ) : null}
    </div>
  );
}

export function ScheduleForm({ schedule }: { schedule?: Schedule }) {
  const { state, errors, pending, onSubmit } = useServerForm(saveSchedule.bind(null, schedule?.id ?? null));
  const [type, setType] = useState<"WEEKLY" | "CYCLE">(schedule?.type ?? "WEEKLY");
  const [weekly, setWeekly] = useState<WeeklyDays>(
    schedule?.type === "WEEKLY"
      ? (schedule.days as WeeklyDays)
      : Object.fromEntries([1, 2, 3, 4, 5].map((d) => [String(d), COMMERCIAL])),
  );
  const [cycle, setCycle] = useState<CycleDays>(schedule?.type === "CYCLE" ? (schedule.days as CycleDays) : CYCLE_PRESETS[0].days);
  const [worksOnHolidays, setWorksOnHolidays] = useState(schedule?.worksOnHolidays ?? false);
  const [busy, startBusy] = useTransition();
  const locked = schedule?.inUse ?? false;

  const days = type === "WEEKLY" ? weekly : cycle;
  const total = weeklyMinutes({ type, days } as Parameters<typeof weeklyMinutes>[0]);

  function copyMondayToWeekdays() {
    const monday = weekly["1"] ?? [];
    setWeekly({ ...weekly, ...Object.fromEntries([2, 3, 4, 5].map((d) => [String(d), monday])) });
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="days" value={JSON.stringify(days)} />

      {locked ? (
        <Alert>
          <LockIcon />
          <AlertDescription>
            Esta jornada já foi atribuída a funcionários. Os horários estão bloqueados para não alterar o histórico. Para
            mudar horários, duplique a jornada e atribua a nova versão a partir da data desejada.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" defaultValue={schedule?.name} placeholder="Ex.: Comercial 44h" required />
        </Field>
        <Field label="Descrição (opcional)" htmlFor="description">
          <Input id="description" name="description" defaultValue={schedule?.description ?? ""} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3" disabled={locked}>
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["WEEKLY", "Semanal", "Horários por dia da semana"],
              ["CYCLE", "Escala em ciclo", "12x36, 24x48, 6x1…"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={cn(
                "flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
                type === value ? "border-primary bg-primary/5" : "hover:bg-muted",
              )}
              aria-pressed={type === value}
            >
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {type === "WEEKLY" ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Horários</h3>
            {!locked ? (
              <Button type="button" variant="ghost" size="sm" onClick={copyMondayToWeekdays}>
                <CopyIcon /> Copiar segunda para terça a sexta
              </Button>
            ) : null}
          </div>
          <ul className="divide-y rounded-lg border">
            {WEEK_ORDER.map((d) => {
              const key = String(d) as keyof WeeklyDays;
              const periods = weekly[key] ?? [];
              return (
                <li key={d} className="grid gap-2 p-3 sm:grid-cols-[7rem_1fr_4rem] sm:items-start">
                  <span className="pt-1.5 text-sm font-medium">{WEEKDAY_NAMES[d]}</span>
                  <PeriodsEditor
                    periods={periods}
                    onChange={(p) => setWeekly({ ...weekly, [key]: p })}
                    disabled={locked}
                  />
                  <span className="pt-1.5 text-right text-xs text-muted-foreground tabular-nums">
                    {periods.length ? formatMinutes(dayMinutes(periods)) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Dia 1 do ciclo" htmlFor="cycleStartDate" error={errors.cycleStartDate}>
              <Input
                id="cycleStartDate"
                name="cycleStartDate"
                type="date"
                defaultValue={schedule?.cycleStartDate ?? ""}
                disabled={locked}
                className="w-44"
                required
              />
            </Field>
            {!locked ? (
              <div className="flex flex-wrap gap-1.5">
                {CYCLE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCycle(preset.days);
                      setWorksOnHolidays(preset.worksOnHolidays);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          {locked ? <input type="hidden" name="cycleStartDate" value={schedule?.cycleStartDate ?? ""} /> : null}
          <ul className="divide-y rounded-lg border">
            {cycle.map((periods, i) => (
              <li key={i} className="grid gap-2 p-3 sm:grid-cols-[7rem_1fr_4rem] sm:items-start">
                <span className="flex items-center gap-1 pt-1.5 text-sm font-medium">
                  Dia {i + 1}
                  {!locked && cycle.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remover dia ${i + 1}`}
                      onClick={() => setCycle(cycle.filter((_, j) => j !== i))}
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </span>
                <PeriodsEditor
                  periods={periods}
                  onChange={(p) => setCycle(cycle.map((d, j) => (j === i ? p : d)))}
                  disabled={locked}
                />
                <span className="pt-1.5 text-right text-xs text-muted-foreground tabular-nums">
                  {periods.length ? formatMinutes(dayMinutes(periods)) : ""}
                </span>
              </li>
            ))}
          </ul>
          {!locked && cycle.length < 28 ? (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setCycle([...cycle, []])}>
              <PlusIcon /> Dia no ciclo
            </Button>
          ) : null}
        </section>
      )}

      {errors.days ? <p className="text-sm text-destructive">{errors.days}</p> : null}

      <p className="text-sm">
        Carga semanal{type === "CYCLE" ? " média" : ""}: <strong className="tabular-nums">{formatMinutes(total)}</strong>
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="worksOnHolidays"
            name="worksOnHolidays"
            value="on"
            checked={worksOnHolidays}
            onCheckedChange={(v) => setWorksOnHolidays(Boolean(v))}
            disabled={locked}
          />
          <Label htmlFor="worksOnHolidays">Trabalha em feriados</Label>
          {locked && worksOnHolidays ? <input type="hidden" name="worksOnHolidays" value="on" /> : null}
        </div>
        {schedule ? (
          <div className="flex items-center gap-2">
            <Checkbox id="active" name="active" value="on" defaultChecked={schedule.active} />
            <Label htmlFor="active">Jornada ativa (disponível para atribuição)</Label>
          </div>
        ) : null}
      </div>

      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingText="Salvando…">
          {schedule ? "Salvar alterações" : "Criar jornada"}
        </SubmitButton>
        {schedule ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => startBusy(async () => void (await duplicateScheduleAction(schedule.id)))}
          >
            <CopyIcon /> Duplicar
          </Button>
        ) : null}
        {schedule && !schedule.inUse ? (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={busy}
            onClick={() => {
              if (!confirm(`Excluir a jornada "${schedule.name}"?`)) return;
              startBusy(async () => {
                const r = await deleteScheduleAction(schedule.id);
                if (r && !r.ok) toast.error(r.message);
              });
            }}
          >
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  );
}
