"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DownloadIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Field, NativeSelect, SubmitButton, useServerForm } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addHoliday, importHolidays, removeHoliday } from "../actions";

type Holiday = { id: string; date: string; name: string; scope: "NATIONAL" | "STATE" | "MUNICIPAL" };

const SCOPE_LABELS = { NATIONAL: "Nacional", STATE: "Estadual", MUNICIPAL: "Municipal" } as const;
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} (${weekday})`;
}

export function HolidayList({ holidays, year }: { holidays: Holiday[]; year: number }) {
  const [pending, start] = useTransition();
  const [includeOptional, setIncludeOptional] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await importHolidays(year, includeOptional);
              if (r.ok) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          <DownloadIcon /> Importar feriados nacionais de {year}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={includeOptional} onCheckedChange={(v) => setIncludeOptional(Boolean(v))} />
          Incluir Carnaval e Corpus Christi (pontos facultativos)
        </label>
      </div>

      {holidays.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nenhum feriado em {year}.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-24 font-medium tabular-nums">{formatDate(h.date)}</span>
                <span>{h.name}</span>
                <Badge variant="secondary">{SCOPE_LABELS[h.scope]}</Badge>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Excluir ${h.name}`}
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Excluir "${h.name}"?`)) return;
                  start(async () => {
                    const r = await removeHoliday(h.id);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.message);
                  });
                }}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AddHolidayForm({ year }: { year: number }) {
  const { state, errors, pending, onSubmit } = useServerForm(addHoliday);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} method="post" onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
      <p className="text-sm font-medium">Adicionar feriado estadual, municipal ou da empresa</p>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr_10rem]">
        <Field label="Data" htmlFor="h-date" error={errors.date}>
          <Input id="h-date" name="date" type="date" min={`${year}-01-01`} required />
        </Field>
        <Field label="Nome" htmlFor="h-name" error={errors.name}>
          <Input id="h-name" name="name" placeholder="Ex.: Aniversário da cidade" required />
        </Field>
        <Field label="Abrangência" htmlFor="h-scope">
          <NativeSelect id="h-scope" name="scope" defaultValue="MUNICIPAL">
            <option value="NATIONAL">Nacional</option>
            <option value="STATE">Estadual</option>
            <option value="MUNICIPAL">Municipal</option>
          </NativeSelect>
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending} pendingText="Adicionando…">
          Adicionar
        </SubmitButton>
      </div>
      <Label className="text-xs font-normal text-muted-foreground">
        Feriados valem para toda a empresa e são folga nas jornadas que não trabalham em feriados.
      </Label>
    </form>
  );
}
