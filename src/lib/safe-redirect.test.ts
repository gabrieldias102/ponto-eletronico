import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  it("aceita caminhos internos com query", () => {
    expect(safeNext("/ponto?qr=abc")).toBe("/ponto?qr=abc");
  });

  it("recusa outros sites", () => {
    expect(safeNext("https://evil.com")).toBe("/inicio");
    expect(safeNext("//evil.com")).toBe("/inicio");
    expect(safeNext("/\\evil.com")).toBe("/inicio");
    expect(safeNext(undefined)).toBe("/inicio");
  });
});
