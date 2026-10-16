const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** Luminância relativa (WCAG 2.x) de uma cor #rrggbb. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Cor de texto (branco ou quase preto) com melhor contraste sobre `background`. */
export function readableForeground(background: string): string {
  const l = luminance(background);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithDark = (l + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithDark ? "#ffffff" : "#171717";
}
