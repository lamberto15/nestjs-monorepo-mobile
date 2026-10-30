// https://docs.expo.dev/workflow/configuration/ — app.json is the base; this
// file sets what differs per project without editing the template.
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The iOS bundle identifier and Android package: `APP_ID` in `.env.local` (or the
 * EAS environment), e.g. `dev.lamby.nestjsmobile`. Permanent once an app is
 * in a store. Without it the template's placeholder stays.
 */
const appId = process.env.APP_ID;
if (appId && !/^[a-zA-Z][\w-]*(\.[a-zA-Z][\w-]*)+$/.test(appId)) {
  throw new Error(
    `APP_ID "${appId}" is not a reverse-domain identifier such as dev.example.app.`,
  );
}

/**
 * Passkeys: the app may use the credentials of the API's domain (the
 * WebAuthn RP ID), which serves `apple-app-site-association` listing
 * `<TEAMID>.<APP_ID>` (backend `PASSKEY_APPLE_APPS`). `mode=developer`
 * outside store builds: iOS reads the file from the domain itself, not
 * Apple's cache (Developer Mode on a device). `PASSKEYS=off` leaves the
 * link out: a free Apple team can't sign it for a real device.
 */
const apiHost =
  process.env.PASSKEYS !== 'off' && process.env.EXPO_PUBLIC_API_URL
    ? new URL(process.env.EXPO_PUBLIC_API_URL).hostname
    : undefined;
const developerMode =
  process.env.EAS_BUILD_PROFILE === 'production' ? '' : '?mode=developer';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'NestJS Mobile',
  slug: config.slug ?? 'nestjs-monorepo-mobile',
  ...(appId && {
    ios: {
      ...config.ios,
      bundleIdentifier: appId,
      ...(apiHost && {
        associatedDomains: [`webcredentials:${apiHost}${developerMode}`],
      }),
    },
    android: { ...config.android, package: appId },
    // The app's ID is also a URL scheme: a provider sign-in hands back on
    // `<APP_ID>:/auth` (the API's NATIVE_REDIRECT_URIS, reverse-DNS).
    scheme: [config.scheme, appId].flat().filter(Boolean) as string[],
  }),
});
