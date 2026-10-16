"use client";

import { SubmitButton, useServerForm } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { saveAdjustmentSettings } from "./actions";

type Props = { settings: { adjustmentRequireJustification: boolean; adjustmentRequireAttachment: boolean } };

export function AdjustmentSettingsForm({ settings }: Props) {
  const { pending, onSubmit } = useServerForm(saveAdjustmentSettings);
  return (
    <form method="post" onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Solicitações de ajuste</h2>
        <p className="text-sm text-muted-foreground">O que o funcionário precisa informar ao pedir um ajuste.</p>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox
          id="adjustmentRequireJustification"
          name="adjustmentRequireJustification"
          value="on"
          defaultChecked={settings.adjustmentRequireJustification}
        />
        <Label htmlFor="adjustmentRequireJustification">Exigir justificativa</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox
          id="adjustmentRequireAttachment"
          name="adjustmentRequireAttachment"
          value="on"
          defaultChecked={settings.adjustmentRequireAttachment}
        />
        <Label htmlFor="adjustmentRequireAttachment">Exigir comprovante (foto ou PDF)</Label>
      </div>
      <div>
        <SubmitButton pending={pending} pendingText="Salvando…">
          Salvar
        </SubmitButton>
      </div>
    </form>
  );
}
