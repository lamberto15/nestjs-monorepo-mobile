import { contrastRatio, readable } from '@/constants/contrast';
import { brandColors } from '@/features/tenant/branding';

test('contrast follows WCAG', () => {
  expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
  expect(contrastRatio('#ffffff', '#0B6BCB')).toBeCloseTo(5.28, 1);
  expect(readable('#ffffff', '#208AEF')).toBe(false); // 3.5:1
});

test("a tenant's colour is used only where it stays readable", () => {
  // Too light for white text and for links on white: the theme's stay.
  expect(brandColors('#208AEF', null)).toEqual({
    light: {},
    dark: { link: '#208AEF' },
  });
  // Dark enough for both in light mode.
  expect(brandColors('#0B6BCB', null).light).toEqual({
    primary: '#0B6BCB',
    link: '#0B6BCB',
  });
  // Not a colour: ignored.
  expect(brandColors('red', undefined)).toEqual({});
});
