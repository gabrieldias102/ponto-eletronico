"use client";

import { useTransition } from "react";
import { CopyIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rotateQr } from "./actions";

export function QrPanel({ url }: { url: string }) {
  const [pending, start] = useTransition();

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Painel do QR code</h2>
        <p className="text-sm text-muted-foreground">
          Abra este link em um tablet ou monitor na empresa. O QR code muda a cada minuto; o funcionário escaneia
          com a câmera do celular e é levado para a tela de registro.
        </p>
      </div>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" aria-label="Link do painel" />
        <Button
          variant="outline"
          size="icon"
          aria-label="Copiar link"
          onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copiado."))}
        >
          <CopyIcon />
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir painel"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border hover:bg-muted"
        >
          <ExternalLinkIcon className="size-4" />
        </a>
      </div>
      <div>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (!confirm("Gerar um novo QR code? O link atual do painel deixará de funcionar.")) return;
            start(async () => {
              const r = await rotateQr();
              toast.success(r.message);
            });
          }}
        >
          <RefreshCwIcon /> Gerar novo link
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">Use se o link do painel tiver vazado.</p>
      </div>
    </section>
  );
}
