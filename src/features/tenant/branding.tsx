/**
 * The tenant's look (backend `branding`): its brand colour as the app's
 * accent, its logo on Home. A colour is used only where it stays readable
 * (WCAG AA, 4.5:1): as a button's fill if white text reads on it, as links
 * if it reads on the background; otherwise the theme's own colour stays.
 */
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { isHexColor, readable } from '@/constants/contrast';
import { Colors } from '@/constants/theme';

type Scheme = 'light' | 'dark';
export type BrandColors = Partial<
  Record<Scheme, { primary?: string; link?: string }>
>;

const BrandContext = createContext<BrandColors>({});

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => unwrap(api.GET('/v1/branding')),
    staleTime: 10 * 60_000,
  });
}

/** The brand colours that keep the theme readable, per scheme. */
export function brandColors(
  light: string | null | undefined,
  dark: string | null | undefined,
): BrandColors {
  const result: BrandColors = {};
  for (const [scheme, color] of [
    ['light', light],
    ['dark', dark ?? light],
  ] as const) {
    if (!isHexColor(color)) {
      continue;
    }
    const theme = Colors[scheme];
    result[scheme] = {
      ...(readable(theme.onPrimary, color) && { primary: color }),
      ...(readable(color, theme.background) && { link: color }),
    };
  }
  return result;
}

/** Signed in: the tenant's colours for everything below (`useTheme` reads them). */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const colors = brandColors(
    branding.data?.primaryColor,
    branding.data?.darkPrimaryColor,
  );
  return <BrandContext value={colors}>{children}</BrandContext>;
}

export const useBrandColors = () => useContext(BrandContext);
