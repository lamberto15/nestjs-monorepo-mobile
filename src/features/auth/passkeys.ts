/**
 * The device's passkeys (`react-native-passkeys`, native code): in a
 * development or store build only. In Expo Go the module is missing, so
 * it loads lazily and `passkeysAvailable()` says false instead of
 * crashing. Its JSON is WebAuthn's, as the API takes and answers it.
 */
import type * as Passkeys from 'react-native-passkeys';

let loaded: typeof Passkeys | null | undefined;

function module(): typeof Passkeys | null {
  if (loaded === undefined) {
    try {
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

/** The passkeys of this device for a sign-in; null: the person cancelled. */
export function getPasskey(options: Parameters<typeof Passkeys.get>[0]) {
  const passkeys = module();
  if (!passkeys) {
    throw new Error('Passkeys need a development build');
  }
  return passkeys.get(options);
}

/** A new passkey on this device; null: the person cancelled. */
export function createPasskey(options: Parameters<typeof Passkeys.create>[0]) {
  const passkeys = module();
  if (!passkeys) {
    throw new Error('Passkeys need a development build');
  }
  return passkeys.create(options);
}
