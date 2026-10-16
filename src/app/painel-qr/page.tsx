import type { Metadata } from "next";
import QRCode from "qrcode";
import { PontualLogo } from "@/components/brand/pontual-logo";
import { qrTokenAt, QR_WINDOW_MS, verifyKioskKey } from "@/lib/qr-token";
import { baseUrl } from "@/server/base-url";
import { getOrganization } from "@/server/organization";
import { getQrSecret } from "@/server/time-entries";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Painel de ponto", robots: { index: false } };

/**
 * Painel público para tablet/monitor na empresa. Protegido pela chave na URL (derivada do segredo).
 * O QR leva para /ponto?qr=<token>; o token muda a cada minuto.
 */
export default async function KioskPage({ searchParams }: { searchParams: Promise<{ chave?: string }> }) {
  const { chave } = await searchParams;
  const [secret, organization, base] = await Promise.all([getQrSecret(), getOrganization(), baseUrl()]);

  if (!chave || !verifyKioskKey(secret, chave)) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <PontualLogo />
        <p className="text-muted-foreground">Link do painel inválido. Peça um novo ao administrador.</p>
      </main>
    );
  }

  const now = new Date();
  const svg = await QRCode.toString(`${base}/ponto?qr=${qrTokenAt(secret, now)}`, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  // Atualiza logo depois da virada da janela do token.
  const msToNextWindow = QR_WINDOW_MS - (now.getTime() % QR_WINDOW_MS) + 500;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-white p-6 text-center text-neutral-900">
      <AutoRefresh afterMs={msToNextWindow} />
      <div className="flex items-center gap-3">
        {organization.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo enviado pela organização
          <img src={organization.logoUrl} alt="" className="h-12 w-auto max-w-40 object-contain" />
        ) : null}
        <h1 className="text-2xl font-semibold">{organization.name}</h1>
      </div>
      <div
        className="w-full max-w-[min(80vw,60vh)] [&>svg]:h-auto [&>svg]:w-full"
        // SVG gerado pela biblioteca qrcode a partir de uma URL nossa.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="max-w-md text-lg">Aponte a câmera do celular para o QR code para registrar o ponto.</p>
      <PontualLogo className="text-neutral-500 [&_svg]:size-5 [&>span]:text-sm" />
    </main>
  );
}
