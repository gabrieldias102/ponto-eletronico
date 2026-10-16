"use client";

import { Field, SubmitButton, useServerForm } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePunchSettings } from "./actions";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  settings: {
    punchRequireGeolocation: boolean;
    punchRequireGeofence: boolean;
    punchRequireSelfie: boolean;
    punchRequireQrCode: boolean;
    businessHoursStart: string;
    businessHoursEnd: string;
    businessDays: number[];
  };
};

const VALIDATIONS = [
  {
    name: "punchRequireGeolocation",
    label: "Registrar a localização",
    hint: "Guarda as coordenadas do aparelho em cada batida.",
  },
  {
    name: "punchRequireGeofence",
    label: "Exigir cerca virtual",
    hint: "Só aceita a batida dentro de um dos locais permitidos abaixo. Inclui o registro da localização.",
  },
  { name: "punchRequireSelfie", label: "Exigir selfie", hint: "Foto tirada na hora pela câmera frontal." },
  {
    name: "punchRequireQrCode",
    label: "Exigir QR code",
    hint: "O funcionário escaneia o QR code exibido no painel da empresa.",
  },
] as const;

export function PunchSettingsForm({ settings }: Props) {
  const { state, errors, pending, onSubmit } = useServerForm(savePunchSettings);

  return (
    <form method="post" onSubmit={onSubmit} className="flex max-w-xl flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Validações da batida</legend>
        <p className="text-sm text-muted-foreground">
          Padrão da empresa. Cada funcionário pode ter exceções no cadastro de usuários.
        </p>
        {VALIDATIONS.map((v) => (
          <div key={v.name} className="flex items-start gap-3">
            <Checkbox id={v.name} name={v.name} value="on" defaultChecked={settings[v.name]} className="mt-0.5" />
            <div>
              <Label htmlFor={v.name}>{v.label}</Label>
              <p className="text-xs text-muted-foreground">{v.hint}</p>
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold">Horário comercial</legend>
        <p className="text-sm text-muted-foreground">
          Fora deste horário, o funcionário vê um aviso antes de registrar. Vale até as jornadas individuais
          serem configuradas.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
          <Field label="Início" htmlFor="businessHoursStart" error={errors.businessHoursStart}>
            <Input id="businessHoursStart" name="businessHoursStart" type="time" defaultValue={settings.businessHoursStart} required />
          </Field>
          <Field label="Término" htmlFor="businessHoursEnd" error={errors.businessHoursEnd}>
            <Input id="businessHoursEnd" name="businessHoursEnd" type="time" defaultValue={settings.businessHoursEnd} required />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Dias úteis</p>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((label, day) => (
              <label key={day} className="flex items-center gap-1.5 text-sm">
                <Checkbox name="businessDays" value={String(day)} defaultChecked={settings.businessDays.includes(day)} />
                {label}
              </label>
            ))}
          </div>
          {errors.businessDays ? <p className="mt-1 text-xs text-destructive">{errors.businessDays}</p> : null}
        </div>
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
