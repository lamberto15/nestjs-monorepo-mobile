/**
 * Links the system hands the app, before Expo Router opens them. A
 * provider sign-in's return (`<APP_ID>:/auth?code=…`) belongs to the
 * browser session that waits for it (`signInWithProvider`), not to a
 * screen: on Android it also arrives as a link, so it opens nothing here.
 */
export function redirectSystemPath({ path }: { path: string }): string {
  try {
    const { pathname } = new URL(path, 'app://');
    return pathname === '/auth' ? '/' : path;
  } catch {
    return path; // never crash on a link
  }
}
