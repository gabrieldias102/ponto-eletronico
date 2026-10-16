"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useServerForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STEP_LABELS, type ReviewStep } from "@/lib/adjustments";
import { cancelAdjustmentAction, reviewAdjustmentAction } from "../actions";

export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancelar esta solicitação?")) return;
        start(async () => {
          const r = await cancelAdjustmentAction(id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
    >
      Cancelar solicitação
    </Button>
  );
}

export function ReviewForm({ id, step }: { id: string; step: ReviewStep }) {
  const router = useRouter();
  const { state, errors, pending, onSubmit } = useServerForm(reviewAdjustmentAction.bind(null, id));

  useEffect(() => {
    if (state.ok) router.push("/aprovacoes");
  }, [state, router]);

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Sua decisão (etapa: {STEP_LABELS[step]})</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="comment">Comentário (obrigatório para rejeitar)</Label>
        <Textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={1000}
          placeholder="Ao rejeitar, explique o motivo para o funcionário"
          aria-invalid={!!errors.comment}
        />
        {errors.comment ? <p className="text-xs text-destructive">{errors.comment}</p> : null}
      </div>
      {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="APPROVED" size="lg" disabled={pending}>
          <CheckIcon /> Aprovar
        </Button>
        <Button type="submit" name="decision" value="REJECTED" size="lg" variant="destructive" disabled={pending}>
          <XIcon /> Rejeitar
        </Button>
      </div>
    </form>
  );
}
