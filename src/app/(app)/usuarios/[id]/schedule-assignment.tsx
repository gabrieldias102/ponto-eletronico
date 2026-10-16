"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Field, NativeSelect, SubmitButton, useServerForm } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignScheduleAction, removeAssignmentAction } from "../actions";

type Assignment = { id: string; startDate: string; schedule: { id: string; name: string } };

function formatDate(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function ScheduleAssignment({
  userId,
  assignments,
  currentId,
  options,
  today,
}: {
  userId: string;
  assignments: Assignment[];
  currentId: string | null;
  options: { id: string; name: string }[];
  today: string;
}) {
  const { errors, pending, onSubmit } = useServerForm(assignScheduleAction.bind(null, userId));
  const [removing, start] = useTransition();

  return (
    <section className="mt-10 flex max-w-xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Jornada</h2>
        <p className="text-sm text-muted-foreground">
          Sem jornada, o aviso de batida fora do horário usa o horário comercial da empresa.
        </p>
      </div>

      {assignments.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {assignments.map((a) => {
            const future = a.startDate > today;
            return (
              <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.schedule.name}</span>
                  <span className="text-muted-foreground">a partir de {formatDate(a.startDate)}</span>
                  {a.id === currentId ? <Badge>Vigente</Badge> : null}
                  {future ? <Badge variant="outline">Agendada</Badge> : null}
                </span>
                {future ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover atribuição"
                    disabled={removing}
                    onClick={() =>
                      start(async () => {
                        const r = await removeAssignmentAction(userId, a.id);
                        if (r.ok) toast.success(r.message);
                        else toast.error(r.message);
                      })
                    }
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma jornada atribuída.</p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cadastre uma jornada em Jornadas para poder atribuir.</p>
      ) : (
        <form method="post" onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Nova jornada" htmlFor="scheduleId" error={errors.scheduleId}>
              <NativeSelect id="scheduleId" name="scheduleId" defaultValue={currentId ? "" : options[0].id} required>
                {currentId ? <option value="">Selecione…</option> : null}
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="A partir de" htmlFor="startDate" error={errors.startDate}>
            <Input id="startDate" name="startDate" type="date" defaultValue={today} className="sm:w-44" required />
          </Field>
          <SubmitButton pending={pending} pendingText="Atribuindo…">
            Atribuir
          </SubmitButton>
        </form>
      )}
    </section>
  );
}
