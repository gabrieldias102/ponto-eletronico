import { describe, expect, it } from "vitest";
import { kioskKey, QR_WINDOW_MS, qrTokenAt, verifyKioskKey, verifyQrToken } from "./qr-token";

const secret = "segredo-de-teste";
const now = new Date("2026-10-16T12:00:30Z");

describe("QR code rotativo", () => {
  it("aceita o token da janela atual", () => {
    expect(verifyQrToken(secret, qrTokenAt(secret, now), now)).toBe(true);
  });

  it("aceita tokens de até duas janelas atrás", () => {
    const token = qrTokenAt(secret, now);
    expect(verifyQrToken(secret, token, new Date(now.getTime() + 2 * QR_WINDOW_MS))).toBe(true);
  });

  it("recusa token expirado", () => {
    const token = qrTokenAt(secret, now);
    expect(verifyQrToken(secret, token, new Date(now.getTime() + 3 * QR_WINDOW_MS))).toBe(false);
  });

  it("recusa token do futuro e de outro segredo", () => {
    const future = qrTokenAt(secret, new Date(now.getTime() + QR_WINDOW_MS));
    expect(verifyQrToken(secret, future, now)).toBe(false);
    expect(verifyQrToken("outro", qrTokenAt(secret, now), now)).toBe(false);
  });

  it("recusa lixo sem lançar erro", () => {
    expect(verifyQrToken(secret, "", now)).toBe(false);
    expect(verifyQrToken(secret, "x".repeat(500), now)).toBe(false);
  });

  it("chave do painel depende do segredo", () => {
    expect(verifyKioskKey(secret, kioskKey(secret))).toBe(true);
    expect(verifyKioskKey(secret, kioskKey("outro"))).toBe(false);
    expect(verifyKioskKey(secret, "curta")).toBe(false);
  });
});
