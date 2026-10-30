/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Every text pair below meets WCAG AA (4.5:1) and every border or control
 * edge 3:1 (`theme.test.ts` checks them). `backgroundElement` is the raised
 * surface of cards and rows; `backgroundSelected` its pressed state.
 */
export const Colors = {
  light: {
    text: '#14161B',
    background: '#FFFFFF',
    backgroundElement: '#F4F5F7',
    backgroundSelected: '#E6E8EC',
    textSecondary: '#5B616E',
    border: '#D8DCE3',
    // Controls' edges, the focused field's ring, the switch's track.
    control: '#8A909C',
    // White on primary 5.3; link on background 5.3.
    primary: '#0B6BCB',
    onPrimary: '#FFFFFF',
    link: '#0B6BCB',
    // White on dangerFill 5.2: a destructive button.
    dangerFill: '#CE2C31',
    danger: '#CE2C31',
  },
  dark: {
    text: '#F4F5F7',
    background: '#000000',
    backgroundElement: '#1C1D21',
    backgroundSelected: '#2A2C31',
    textSecondary: '#A9AFB9',
    border: '#34383F',
    control: '#5A606B',
    // White on primary 5.3; link on background 9.6.
    primary: '#0B6BCB',
    onPrimary: '#FFFFFF',
    link: '#6CB4FF',
    dangerFill: '#CE2C31',
    danger: '#FF6369',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radii: fields and buttons, cards and groups, chips. */
export const Radius = {
  control: 14,
  card: 18,
  pill: 999,
} as const;

/** Every control is at least this tall: a finger-sized target (44 pt). */
export const ControlHeight = 52;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
