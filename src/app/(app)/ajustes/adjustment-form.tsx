"use client";

import { useEffect, useState } from "react";
import { Field, NativeSelect, SubmitButton, useServerForm } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TYPE_LABELS, type AdjustmentType } from "@/lib/adjustments";
import { cn } from "@/lib/utils";
import { createAdjustmentAction, myEntriesOn } from "./actions";

const HINTS: Record<AdjustmentType, string> = {
  INCLUSION: "Esqueceu de bater o ponto",
  CORRECTION: "Bateu no horário errado",
  ABSENCE: "Falta ou período justificado (ex.: atestado)",
};

export type AdjustmentDefaults = {
  type: AdjustmentType;
  date: string;
  endDate?: string;
  time?: string;
  timeEntryId?: string;
  partial?: boolean;
  absenceStart?: string;
  absenceEnd?: string;
  justification?: string;
  previousRequestId?: string;
};

type Props = {
  defaults: AdjustmentDefaults;
  today: string;
  requireJustification: boolean;
  requireAttachment: boolean;
};

export function AdjustmentForm({ defaults, today, requireJustification, requireAttachment }: Props) {
  const { state, errors, pending, onSubmit } = useServerForm(createAdjustmentAction);
  const [type, setType] = useState<AdjustmentType>(defaults.type);
  const [date, setDate] = useState(defaults.date);
  const [partial, setPartial] = useState(defaults.partial ?? false);
  const [entries, setEntries] = useState<{ id: string; label: string }[] | null>(null);

  // Marcações do dia escolhido, para a correção.
  useEffect(() => {
    if (type !== "CORRECTION" || !date) return;
    let active = true;
    myEntriesOn(date).then((list) => {
      if (active) setEntries(list);
    });
    return () => {
      active = false;
    };
  }, [type, date]);

  return (
    <form method="post" onSubmit={onSubmit} className="flex max-w-xl flex-col gap-6" encType="multipart/form-data">
      <input type="hidden" name="type" value={type} />
      {defaults.previousRequestId ? <input type="hidden" name="previousRequestId" value={defaults.previousRequestId} /> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">O que você precisa?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(TYPE_LABELS) as AdjustmentType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                "flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                type === t ? "border-primary bg-primary/5" : "hover:bg-muted",
              )}
            >
              <span className="font-medium">{TYPE_LABELS[t]}</span>
              <span className="text-xs text-muted-foreground">{HINTS[t]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {type === "ABSENCE" ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primeiro dia" htmlFor="date" error={errors.date}>
              <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            {!partial ? (
              <Field label="Último dia" htmlFor="endDate" error={errors.endDate}>
                <Input id="endDate" name="endDate" type="date" defaultValue={defaults.endDate ?? date} min={date} required />
              </Field>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="partial" name="partial" value="on" checked={partial} onCheckedChange={(v) => setPartial(Boolean(v))} />
            <Label htmlFor="partial">Só parte do dia (ex.: consulta das 14h às 16h)</Label>
          </div>
          {partial ? (
            <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
              <Field label="Das" htmlFor="absenceStart" error={errors.absenceStart}>
                <Input id="absenceStart" name="absenceStart" type="time" defaultValue={defaults.absenceStart} required />
              </Field>
              <Field label="Até" htmlFor="absenceEnd" error={errors.absenceEnd}>
                <Input id="absenceEnd" name="absenceEnd" type="time" defaultValue={defaults.absenceEnd} required />
              </Field>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dia" htmlFor="date" error={errors.date}>
            <Input id="date" name="date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label={type === "CORRECTION" ? "Horário correto" : "Horário"} htmlFor="time" error={errors.time}>
            <Input id="time" name="time" type="time" defaultValue={defaults.time} required />
          </Field>
          {type === "CORRECTION" ? (
            <div className="sm:col-span-2">
              <Field label="Marcação a corrigir" htmlFor="timeEntryId" error={errors.timeEntryId}>
                {/* Remonta quando as marcações chegam, para o defaultValue (vindo do link "Corrigir") valer. */}
                <NativeSelect
                  id="timeEntryId"
                  name="timeEntryId"
                  defaultValue={defaults.timeEntryId ?? ""}
                  key={`${date}-${entries?.length ?? "carregando"}`}
                  required
                >
                  <option value="">{entries === null ? "Carregando…" : entries.length ? "Selecione…" : "Nenhuma marcação neste dia"}</option>
                  {entries?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          ) : null}
        </div>
      )}

      <Field
        label={`Justificativa${requireJustification ? "" : " (opcional)"}`}
        htmlFor="justification"
        error={errors.justification}
      >
        <Textarea
          id="justification"
          name="justification"
          rows={3}
          maxLength={1000}
          defaultValue={defaults.justification}
          required={requireJustification}
        />
      </Field>

      <Field
        label={`Comprovante${requireAttachment ? "" : " (opcional)"}`}
        htmlFor="attachment"
        error={errors.attachment}
        hint="Foto ou PDF de até 5 MB. Só você, seu gestor e o RH veem."
      >
        <Input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required={requireAttachment}
        />
      </Field>

      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <div>
        <SubmitButton pending={pending} pendingText="Enviando…">
          {defaults.previousRequestId ? "Reenviar solicitação" : "Enviar solicitação"}
        </SubmitButton>
      </div>
    </form>
  );
}
