"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Field, NativeSelect, SubmitButton, useServerForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteDepartmentAction, saveDepartment } from "./actions";

type Props = {
  department?: { id: string; name: string; managerId: string | null; memberCount: number };
  managers: { id: string; name: string }[];
};

export function DepartmentForm({ department, managers }: Props) {
  const { state, errors, pending, onSubmit } = useServerForm(saveDepartment.bind(null, department?.id ?? null));
  const [deleting, startDelete] = useTransition();

  function remove() {
    if (!department || !confirm(`Excluir o setor "${department.name}"?`)) return;
    startDelete(async () => {
      const result = await deleteDepartmentAction(department.id);
      if (result && !result.ok) toast.error(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Nome do setor" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" defaultValue={department?.name} required aria-invalid={!!errors.name} />
      </Field>

      <Field
        label="Gestor"
        htmlFor="managerId"
        error={errors.managerId}
        hint={
          managers.length === 0
            ? "Cadastre um usuário com perfil Gestor para poder selecioná-lo aqui."
            : "Aprova os ajustes de ponto dos funcionários do setor."
        }
      >
        <NativeSelect id="managerId" name="managerId" defaultValue={department?.managerId ?? ""}>
          <option value="">Sem gestor</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingText="Salvando…">{department ? "Salvar alterações" : "Criar setor"}</SubmitButton>
        {department ? (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={remove}
            disabled={deleting || department.memberCount > 0}
            title={department.memberCount > 0 ? "Mova os funcionários para outro setor antes" : undefined}
          >
            Excluir setor
          </Button>
        ) : null}
      </div>
    </form>
  );
}
