/**
 * Light, dark, or the phone's setting: a display preference of this
 * device (not the account's), kept in `expo-sqlite`'s key-value store and
 * applied through React Native's `Appearance`, so the app's colours, its
 * navigation and the system's controls all follow it.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type AppearanceMode = (typeof APPEARANCES)[number];

const KEY = 'appearance';
const listeners = new Set<() => void>();

export function savedAppearance(): AppearanceMode {
  try {
    const saved = Storage.getItemSync(KEY);
    return APPEARANCES.find((mode) => mode === saved) ?? 'system';
  } catch {
    return 'system'; // no store (web): the system's
  }
}

export function applyAppearance(mode: AppearanceMode) {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

export function saveAppearance(mode: AppearanceMode) {
  try {
    Storage.setItemSync(KEY, mode);
  } catch {
    // Not kept (web): it still applies now.
  }
  applyAppearance(mode);
  listeners.forEach((listener) => listener());
}

/** The chosen mode, kept current. */
export function useAppearance(): AppearanceMode {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, savedAppearance);
}
