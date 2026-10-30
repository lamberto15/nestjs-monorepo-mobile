/**
 * The device's passkeys (`react-native-passkeys`, native code): in a
 * development or store build only. In Expo Go the module is missing, so
 * it loads lazily and `passkeysAvailable()` says false instead of
 * crashing. Its JSON is WebAuthn's, as the API takes and answers it.
 */
import { requireOptionalNativeModule } from 'expo';
import type * as Passkeys from 'react-native-passkeys';

let loaded: typeof Passkeys | null | undefined;

function module(): typeof Passkeys | null {
  if (loaded === undefined) {
    // Absent (Expo Go, an older build): don't load the library at all, it
    // would throw and be reported even when caught.
    if (!requireOptionalNativeModule('ReactNativePasskeys')) {
      loaded = null;
      return loaded;
    }
    try {
      // Loaded on first use: importing it at the top crashes Expo Go.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('react-native-passkeys') as typeof Passkeys;
    } catch {
      loaded = null; // Expo Go: no native module
    }
  }
  return loaded;
}

export function passkeysAvailable(): boolean {
  try {
    return module()?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/** The device's prompt failed (no passkey here, not set up…), not cancelled. */
export class PasskeyFailed extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'PasskeyFailed';
  }
}

/**
 * The device's answer as the API validates it: the module gives `null` for
 * the optional fields it doesn't fill (`transports`,
 * `authenticatorAttachment`…), which the API refuses where a value or
 * nothing is expected. They're left out instead.
 */
export function withoutNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(withoutNulls) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== null && item !== undefined)
        .map(([key, item]) => [key, withoutNulls(item)]),
    ) as T;
  }
  return value;
}

/** The device's prompt: null when the person cancels, `PasskeyFailed` otherwise. */
async function prompt<T>(run: (passkeys: typeof Passkeys) => Promise<T>) {
  const passkeys = module();
  if (!passkeys) {
    throw new PasskeyFailed('Passkeys need a development build');
  }
  try {
    const answer = await run(passkeys);
    return answer && withoutNulls(answer);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ERR_USER_CANCELLED') {
      return null;
    }
    throw new PasskeyFailed(
      error instanceof Error ? error.message : String(code),
    );
  }
}

/** The passkeys of this device for a sign-in; null: the person cancelled. */
export const getPasskey = (options: Parameters<typeof Passkeys.get>[0]) =>
  prompt((passkeys) => passkeys.get(options));

/** A new passkey on this device; null: the person cancelled. */
export const createPasskey = (options: Parameters<typeof Passkeys.create>[0]) =>
  prompt((passkeys) => passkeys.create(options));
