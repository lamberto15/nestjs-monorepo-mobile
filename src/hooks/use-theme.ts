/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useBrandColors } from '@/features/tenant/branding';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The colours of the scheme, with the tenant's readable brand colours when signed in. */
export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const brand = useBrandColors()[theme];

  return brand ? { ...Colors[theme], ...brand } : Colors[theme];
}
