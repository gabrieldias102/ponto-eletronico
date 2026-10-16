import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * QR code rotativo do painel.
 *
 * O token muda a cada janela de 60 s e é derivado do segredo da empresa (HMAC). Aceitamos a janela
 * atual e as duas anteriores, dando ao funcionário até ~3 min entre escanear e registrar
 * (inclusive se precisar fazer login). Uma foto do QR deixa de valer em poucos minutos.
 */
export const QR_WINDOW_MS = 60_000;
const ACCEPTED_PAST_WINDOWS = 2;

function hmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("base64url");
}

export function qrTokenAt(secret: string, now: Date): string {
  const window = Math.floor(now.getTime() / QR_WINDOW_MS);
  return hmac(secret, `qr:${window}`).slice(0, 22);
}

export function verifyQrToken(secret: string, token: string, now: Date): boolean {
  const window = Math.floor(now.getTime() / QR_WINDOW_MS);
  for (let i = 0; i <= ACCEPTED_PAST_WINDOWS; i++) {
    const expected = hmac(secret, `qr:${window - i}`).slice(0, 22);
    if (expected.length === token.length && timingSafeEqual(Buffer.from(expected), Buffer.from(token))) {
      return true;
    }
  }
  return false;
}

/** Chave da URL do painel. Muda quando o segredo é trocado. */
export function kioskKey(secret: string): string {
  return hmac(secret, "kiosk").slice(0, 24);
}

export function verifyKioskKey(secret: string, key: string): boolean {
  const expected = kioskKey(secret);
  return expected.length === key.length && timingSafeEqual(Buffer.from(expected), Buffer.from(key));
}
