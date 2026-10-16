import { describe, expect, it } from "vitest";
import { isHexColor, readableForeground } from "./color";

describe("isHexColor", () => {
  it("aceita apenas #rrggbb", () => {
    expect(isHexColor("#0d9488")).toBe(true);
    expect(isHexColor("#FFFFFF")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("0d9488")).toBe(false);
    expect(isHexColor("red")).toBe(false);
  });
});

describe("readableForeground", () => {
  it("usa texto branco sobre cores escuras", () => {
    expect(readableForeground("#000000")).toBe("#ffffff");
    expect(readableForeground("#1e3a8a")).toBe("#ffffff");
  });

  it("usa texto escuro sobre cores claras", () => {
    expect(readableForeground("#ffffff")).toBe("#171717");
    expect(readableForeground("#facc15")).toBe("#171717");
  });
});
