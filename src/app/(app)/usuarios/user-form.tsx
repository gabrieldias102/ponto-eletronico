"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, NativeSelect, SubmitButton, useServerForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requiresDepartment, ROLE_LABELS, type Role } from "@/lib/permissions";
import { resendInviteAction, saveUser } from "./actions";

type Props = {
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    departmentId: string | null;
    active: boolean;
    hasPassword: boolean;
  };
  roles: Role[];
  departments: { id: string; name: string }[];
  isSelf?: boolean;
};

export function UserForm({ user, roles, departments, isSelf = false }: Props) {
  const { state, errors, pending, onSubmit } = useServerForm(saveUser.bind(null, user?.id ?? null));
  const [role, setRole] = useState<Role>(user?.role ?? "EMPLOYEE");
  const [resending, startResend] = useTransition();

  function resend() {
    if (!user) return;
    startResend(async () => {
      const result = await resendInviteAction(user.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Nome completo" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" defaultValue={user?.name} required aria-invalid={!!errors.name} />
      </Field>

      <Field label="E-mail" htmlFor="email" error={errors.email} hint="Usado para entrar no sistema.">
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email}
          required
          aria-invalid={!!errors.email}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Perfil" htmlFor="role" error={errors.role}>
          <NativeSelect
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isSelf}
            aria-invalid={!!errors.role}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
          {/* Campo desabilitado não é enviado no formulário. */}
          {isSelf ? <input type="hidden" name="role" value={role} /> : null}
        </Field>

        {requiresDepartment(role) ? (
          <Field label="Setor" htmlFor="departmentId" error={errors.departmentId}>
            <NativeSelect
              id="departmentId"
              name="departmentId"
              defaultValue={user?.departmentId ?? ""}
              aria-invalid={!!errors.departmentId}
            >
              <option value="">Selecione…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>

      {user ? (
        <div className="flex items-center gap-2">
          <Checkbox id="active" name="active" value="on" defaultChecked={user.active} disabled={isSelf} />
          <Label htmlFor="active">Usuário ativo</Label>
          {isSelf ? <input type="hidden" name="active" value="on" /> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          O usuário receberá um e-mail para definir a senha de acesso.
        </p>
      )}

      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingText="Salvando…">{user ? "Salvar alterações" : "Cadastrar usuário"}</SubmitButton>
        {user && user.active && !isSelf ? (
          <Button type="button" variant="outline" size="lg" onClick={resend} disabled={resending}>
            {user.hasPassword ? "Enviar link de nova senha" : "Reenviar convite"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
