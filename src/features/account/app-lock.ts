/**
 * An optional lock: with it on, the app asks for Face ID, Touch ID or the
 * fingerprint (the device passcode as fallback) when it opens, and when it
 * comes back after a while in the background. The setting lives in the
 * secure store, and goes with the session on sign-out.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { session } from '@/api/session';

const KEY = 'app.lock';
/** Back from the background after this long: locked again. */
export const RELOCK_AFTER_MS = 60_000;

let enabled = false;
let locked = false;
let backgroundSince: number | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Whether this device can lock (a face or fingerprint enrolled). */
export async function canLock(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  return (
    (await LocalAuthentication.hasHardwareAsync()) &&
    (await LocalAuthentication.isEnrolledAsync())
  );
}

/** Whether to lock again: away for longer than the grace time. */
export function shouldRelock(
  awaySince: number | null,
  now: number,
  graceMs = RELOCK_AFTER_MS,
): boolean {
  return awaySince !== null && now - awaySince >= graceMs;
}

export const appLock = {
  isEnabled: () => enabled,
  isLocked: () => locked,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** On app start: the saved setting; locked at once when it's on. */
  async load() {
    enabled =
      Platform.OS !== 'web' && (await SecureStore.getItemAsync(KEY)) === 'on';
    locked = enabled;
    notify();
  },

  async setEnabled(on: boolean) {
    if (on) {
      await SecureStore.setItemAsync(KEY, 'on');
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
    enabled = on;
    locked = false;
    notify();
  },

  /** Asks for the face, the fingerprint or the passcode. */
  async unlock(prompt: string): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
    });
    if (result.success) {
      locked = false;
      notify();
    }
    return result.success;
  },
};

// Away and back: locked again after the grace time.
AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    backgroundSince = Date.now();
  } else if (state === 'active') {
    if (enabled && shouldRelock(backgroundSince, Date.now())) {
      locked = true;
      notify();
    }
    backgroundSince = null;
  }
});

// Signing out turns the lock off: the next person sets their own.
session.subscribe(() => {
  if (session.status() === 'signedOut' && enabled) {
    void appLock.setEnabled(false);
  }
});

export function useAppLock() {
  return {
    enabled: useSyncExternalStore(appLock.subscribe, appLock.isEnabled),
    locked: useSyncExternalStore(appLock.subscribe, appLock.isLocked),
  };
}
