"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LocateFixedIcon, MapPinIcon } from "lucide-react";
import { toast } from "sonner";
import { Field, SubmitButton, useServerForm } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentPosition } from "@/lib/geolocation";
import { addLocation, removeLocation, toggleLocation } from "./actions";

type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
  entryCount: number;
};

function LocationRow({ location }: { location: Location }) {
  const [pending, start] = useTransition();
  function run(action: () => Promise<{ ok?: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          {location.name}
          {!location.active ? <Badge variant="outline">Inativo</Badge> : null}
        </p>
        <a
          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:underline"
        >
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · raio de {location.radiusMeters} m
        </a>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => toggleLocation(location.id, !location.active))}>
          {location.active ? "Desativar" : "Ativar"}
        </Button>
        {location.entryCount === 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (confirm(`Excluir o local "${location.name}"?`)) run(() => removeLocation(location.id));
            }}
          >
            Excluir
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function AddLocationForm() {
  const { state, errors, pending, onSubmit } = useServerForm(addLocation);
  const formRef = useRef<HTMLFormElement>(null);
  const [locating, setLocating] = useState(false);

  // Limpa o formulário depois de adicionar.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  async function useMyLocation() {
    setLocating(true);
    try {
      const p = await getCurrentPosition();
      const form = formRef.current!;
      (form.elements.namedItem("latitude") as HTMLInputElement).value = p.latitude.toFixed(6);
      (form.elements.namedItem("longitude") as HTMLInputElement).value = p.longitude.toFixed(6);
      toast.success(`Localização obtida (precisão de ±${Math.round(p.accuracy)} m).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível obter a localização.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <form ref={formRef} method="post" onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <MapPinIcon className="size-4" /> Novo local
      </p>
      <Field label="Nome" htmlFor="loc-name" error={errors.name}>
        <Input id="loc-name" name="name" placeholder="Ex.: Sede, Filial Centro" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Latitude" htmlFor="loc-lat" error={errors.latitude}>
          <Input id="loc-lat" name="latitude" inputMode="decimal" placeholder="-23.561400" required />
        </Field>
        <Field label="Longitude" htmlFor="loc-lng" error={errors.longitude}>
          <Input id="loc-lng" name="longitude" inputMode="decimal" placeholder="-46.655900" required />
        </Field>
        <Field label="Raio (m)" htmlFor="loc-radius" error={errors.radiusMeters}>
          <Input id="loc-radius" name="radiusMeters" type="number" min={20} max={5000} defaultValue={150} required />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingText="Adicionando…">
          Adicionar local
        </SubmitButton>
        <Button type="button" variant="outline" size="lg" onClick={useMyLocation} disabled={locating}>
          <LocateFixedIcon /> {locating ? "Localizando…" : "Usar minha localização"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Dica: o GPS de celulares costuma variar de 10 a 50 m. Um raio de 100 a 200 m evita recusas indevidas.
      </p>
    </form>
  );
}

export function Locations({ locations }: { locations: Location[] }) {
  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Locais permitidos</h2>
        <p className="text-sm text-muted-foreground">Usados pela cerca virtual.</p>
      </div>
      {locations.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {locations.map((l) => (
            <LocationRow key={l.id} location={l} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum local cadastrado.</p>
      )}
      <AddLocationForm />
    </section>
  );
}
