"use client";

import { Field, SubmitButton, useServerForm } from "@/components/form";
import { Input } from "@/components/ui/input";
import { saveTolerance } from "../actions";

type Props = {
  values: { tolerancePerPunchMinutes: number; toleranceDailyMinutes: number; scheduleWarningMarginMinutes: number };
};

export function ToleranceForm({ values }: Props) {
  const { state, errors, pending, onSubmit } = useServerForm(saveTolerance);

  return (
    <form method="post" onSubmit={onSubmit} className="flex max-w-xl flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Tolerância</legend>
        <p className="text-sm text-muted-foreground">
          Variações de horário que não contam como atraso nem hora extra. A CLT (art. 58, §1º) admite até 5 minutos por
          marcação, limitados a 10 minutos por dia. Será usada no cálculo das horas (Fase 5).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Por marcação (min)" htmlFor="tolerancePerPunchMinutes" error={errors.tolerancePerPunchMinutes}>
            <Input
              id="tolerancePerPunchMinutes"
              name="tolerancePerPunchMinutes"
              type="number"
              min={0}
              max={60}
              defaultValue={values.tolerancePerPunchMinutes}
              required
            />
          </Field>
          <Field label="Limite diário (min)" htmlFor="toleranceDailyMinutes" error={errors.toleranceDailyMinutes}>
            <Input
              id="toleranceDailyMinutes"
              name="toleranceDailyMinutes"
              type="number"
              min={0}
              max={120}
              defaultValue={values.toleranceDailyMinutes}
              required
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Aviso de batida fora da jornada</legend>
        <p className="text-sm text-muted-foreground">
          Antes do início e depois do fim de cada período, a batida é aceita sem aviso dentro desta margem.
        </p>
        <Field label="Margem (min)" htmlFor="scheduleWarningMarginMinutes" error={errors.scheduleWarningMarginMinutes}>
          <Input
            id="scheduleWarningMarginMinutes"
            name="scheduleWarningMarginMinutes"
            type="number"
            min={0}
            max={240}
            defaultValue={values.scheduleWarningMarginMinutes}
            className="sm:w-48"
            required
          />
        </Field>
      </fieldset>

      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div>
        <SubmitButton pending={pending} pendingText="Salvando…">
          Salvar
        </SubmitButton>
      </div>
    </form>
  );
}
