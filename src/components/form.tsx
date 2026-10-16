"use client";

import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Select nativo: no celular abre o seletor do próprio sistema. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function SubmitButton({
  children,
  pendingText,
  pending,
}: {
  children: React.ReactNode;
  pendingText: string;
  pending: boolean;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Liga um formulário a uma server action.
 * Envia via onSubmit (e não pela prop `action`) para o React não limpar os campos
 * quando a validação falha. Mostra um toast com a mensagem de retorno.
 */
export function useServerForm(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, errors: state.fieldErrors ?? {}, pending, onSubmit };
}
