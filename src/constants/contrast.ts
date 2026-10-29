/** WCAG 2 contrast between two `#rrggbb` colours: 1 (none) to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Normal text needs 4.5:1 (WCAG AA). */
export const readable = (foreground: string, background: string) =>
  contrastRatio(foreground, background) >= 4.5;

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map(
    (at) => parseInt(value.slice(at, at + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A `#rrggbb` colour (what the API's branding returns), and nothing else. */
export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
