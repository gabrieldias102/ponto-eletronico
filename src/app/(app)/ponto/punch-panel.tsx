"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CameraIcon, CheckCircle2Icon, MapPinIcon, QrCodeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getCurrentPosition, GeolocationError } from "@/lib/geolocation";
import type { PunchRequirements } from "@/lib/punch-rules";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { punchAction } from "./actions";
import { useCamera } from "./use-camera";

type Props = {
  requirements: PunchRequirements;
  qrToken: string | null;
  limitReached: boolean;
  /** Referência do aviso: a jornada do funcionário ou, sem jornada, o horário comercial. */
  hours: { kind: "schedule" | "business"; text: string };
};

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl" suppressHydrationWarning>
      {now ? formatTime(now) : "--:--:--"}
    </p>
  );
}

function Requirement({ ok, icon: Icon, children }: { ok: boolean; icon: typeof MapPinIcon; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2 text-sm", ok ? "text-foreground" : "text-muted-foreground")}>
      {ok ? <CheckCircle2Icon className="mt-0.5 size-4 text-primary" /> : <Icon className="mt-0.5 size-4" />}
      <span>{children}</span>
    </li>
  );
}

export function PunchPanel({ requirements, qrToken, limitReached, hours }: Props) {
  const hoursLabel = hours.kind === "schedule" ? "Sua jornada hoje" : "Horário comercial";
  const router = useRouter();
  const pathname = usePathname();
  const { videoRef, state: cameraState, start: startCamera, capture } = useCamera(requirements.selfie);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrMissing = requirements.qrCode && !qrToken;
  const cameraMissing = requirements.selfie && cameraState !== "ready";
  const disabled = pending || limitReached || qrMissing || cameraMissing;

  function submit(confirmOutsideHours: boolean) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      try {
        if (requirements.geolocation) {
          setStep("Obtendo localização…");
          const position = await getCurrentPosition();
          formData.set("latitude", String(position.latitude));
          formData.set("longitude", String(position.longitude));
          formData.set("accuracy", String(position.accuracy));
        }
        if (requirements.selfie) {
          setStep("Tirando a selfie…");
          const photo = await capture();
          if (!photo) throw new GeolocationError("Não foi possível tirar a selfie. Verifique a câmera.");
          formData.set("selfie", new File([photo], "selfie.jpg", { type: "image/jpeg" }));
        }
      } catch (e) {
        setStep(null);
        setError(e instanceof Error ? e.message : "Não foi possível preparar o registro.");
        return;
      }

      if (qrToken) formData.set("qr", qrToken);
      if (confirmOutsideHours) formData.set("confirmOutsideHours", "1");

      setStep("Registrando…");
      const result = await punchAction(formData);
      setStep(null);

      if (result.status === "needs-confirmation") {
        setConfirmOpen(true);
        return;
      }
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      // Remove o token do QR da URL: ele vale para uma batida.
      if (qrToken) router.replace(pathname);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-6 text-center sm:p-8">
      <Clock />

      {requirements.selfie ? (
        <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl bg-muted">
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full -scale-x-100 object-cover"
            aria-label="Pré-visualização da câmera"
          />
          {cameraState !== "ready" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-sm text-muted-foreground">
              <CameraIcon className="size-6" />
              {cameraState === "denied"
                ? "Permita o acesso à câmera para tirar a selfie."
                : cameraState === "unavailable"
                  ? "Câmera indisponível neste aparelho."
                  : "Abrindo a câmera…"}
              {cameraState === "denied" || cameraState === "unavailable" ? (
                <Button variant="outline" size="sm" onClick={() => void startCamera()}>
                  Tentar de novo
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {requirements.geolocation || requirements.selfie || requirements.qrCode ? (
        <ul className="flex flex-col gap-1.5 text-left">
          {requirements.geolocation ? (
            <Requirement ok={false} icon={MapPinIcon}>
              {requirements.geofence
                ? "Sua localização será conferida com os locais permitidos."
                : "Sua localização será registrada."}
            </Requirement>
          ) : null}
          {requirements.selfie ? (
            <Requirement ok={cameraState === "ready"} icon={CameraIcon}>
              Uma selfie será registrada com a batida.
            </Requirement>
          ) : null}
          {requirements.qrCode ? (
            <Requirement ok={!qrMissing} icon={QrCodeIcon}>
              {qrMissing
                ? "Escaneie o QR code do painel da empresa com a câmera do celular."
                : "QR code lido."}
            </Requirement>
          ) : null}
        </ul>
      ) : null}

      {error ? <p className="max-w-sm text-sm text-destructive">{error}</p> : null}

      <Button
        size="lg"
        className="h-14 w-full max-w-xs text-base"
        disabled={disabled}
        onClick={() => submit(false)}
      >
        {step ?? (limitReached ? "Limite diário atingido" : "Registrar ponto")}
      </Button>

      <p className="text-xs text-muted-foreground">
        O horário registrado é o do servidor, não o do seu aparelho. {hoursLabel}: {hours.text}.
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{hours.kind === "schedule" ? "Fora da sua jornada" : "Fora do horário comercial"}</AlertDialogTitle>
            <AlertDialogDescription>
              Você está batendo o ponto fora {hours.kind === "schedule" ? "da sua jornada" : "do horário comercial"} (
              {hours.text}). Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                submit(true);
              }}
            >
              Registrar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
