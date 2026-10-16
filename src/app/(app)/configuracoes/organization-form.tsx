"use client";

import { useState } from "react";
import { Field, SubmitButton, useServerForm } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOrganization } from "./actions";

type Props = {
  organization: {
    name: string;
    legalName: string | null;
    taxId: string | null;
    primaryColor: string;
    logoUrl: string | null;
  };
};

export function OrganizationForm({ organization }: Props) {
  const { state, errors, pending, onSubmit } = useServerForm(saveOrganization);
  const [color, setColor] = useState(organization.primaryColor);

  return (
    <form method="post" onSubmit={onSubmit} className="flex max-w-xl flex-col gap-8">
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 text-lg font-semibold">Empresa</legend>
        <Field label="Nome exibido" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" defaultValue={organization.name} required aria-invalid={!!errors.name} />
        </Field>
        <Field label="Razão social" htmlFor="legalName" error={errors.legalName}>
          <Input id="legalName" name="legalName" defaultValue={organization.legalName ?? ""} />
        </Field>
        <Field
          label="CNPJ ou CPF do empregador"
          htmlFor="taxId"
          error={errors.taxId}
          hint="Usado nos comprovantes e arquivos da Portaria 671."
        >
          <Input
            id="taxId"
            name="taxId"
            inputMode="numeric"
            defaultValue={organization.taxId ?? ""}
            aria-invalid={!!errors.taxId}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 text-lg font-semibold">Identidade visual</legend>
        <Field label="Cor principal" htmlFor="primaryColor" error={errors.primaryColor}>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
            />
            <span className="font-mono text-sm text-muted-foreground">{color}</span>
            <span
              className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ background: color }}
            >
              Prévia
            </span>
          </div>
        </Field>

        <Field label="Logo" htmlFor="logo" error={errors.logo} hint="PNG, JPG ou WebP, até 1 MB.">
          {organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo enviado pela organização
            <img
              src={organization.logoUrl}
              alt="Logo atual"
              className="h-14 w-auto max-w-48 rounded border object-contain p-1"
            />
          ) : null}
          <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        </Field>
        {organization.logoUrl ? (
          <div className="flex items-center gap-2">
            <Checkbox id="removeLogo" name="removeLogo" value="on" />
            <Label htmlFor="removeLogo">Remover logo</Label>
          </div>
        ) : null}
      </fieldset>

      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <div>
        <SubmitButton pending={pending} pendingText="Salvando…">Salvar configurações</SubmitButton>
      </div>
    </form>
  );
}
