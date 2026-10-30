import { contrastRatio, readable } from '@/constants/contrast';
import { Colors } from '@/constants/theme';

describe.each(['light', 'dark'] as const)('%s palette', (scheme) => {
  const theme = Colors[scheme];

  it.each([
    ['text', 'background'],
    ['text', 'backgroundElement'],
    ['text', 'backgroundSelected'],
    ['textSecondary', 'background'],
    ['textSecondary', 'backgroundElement'],
    ['textSecondary', 'backgroundSelected'],
    ['link', 'background'],
    ['danger', 'background'],
    ['onPrimary', 'primary'],
  ] as const)('%s reads on %s (4.5:1)', (foreground, background) => {
    expect(readable(theme[foreground], theme[background])).toBe(true);
  });

  // `border` only divides cards and rows; a control's edge must be seen.
  it('control edges stand out from the background (3:1)', () => {
    expect(
      contrastRatio(theme.control, theme.background),
    ).toBeGreaterThanOrEqual(3);
  });
});
