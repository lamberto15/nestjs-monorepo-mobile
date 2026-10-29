/**
 * A link into the app (a notification, a universal link, the app's scheme)
 * that arrives signed out: the sign-in comes first, then the link opens.
 */

/** The signed-out screens: a link to one of them is not kept. */
const SIGNED_OUT = [
  '/sign-in',
  '/sign-up',
  '/two-factor',
  '/choose-tenant',
  '/forgot-password',
  '/check-email',
];

/**
 * The app path a link leads to: `scheme://notes/1`, `https://host/notes/1`
 * and Expo Go's `exp://host/--/notes/1` all give `/notes/1` (with its query).
 * Undefined for the app's root or a signed-out screen.
 */
export function linkPath(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  let path: string;
  try {
    const parsed = new URL(url);
    const expoGo = parsed.pathname.split('/--')[1];
    path =
      expoGo ??
      (parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? parsed.pathname
        : // A custom scheme: the "host" is the first segment of the path.
          `/${parsed.host}${parsed.pathname}`);
    path = `${path.replace(/\/+$/, '')}${parsed.search}`;
  } catch {
    return undefined;
  }
  if (!path || path === '/' || !path.startsWith('/')) {
    return undefined;
  }
  return SIGNED_OUT.some(
    (screen) => path === screen || path.startsWith(`${screen}?`),
  )
    ? undefined
    : path;
}

let pending: string | undefined;

export const pendingLink = {
  /** Keeps a link that arrived signed out. */
  keep(url: string | null | undefined) {
    pending = linkPath(url) ?? pending;
  },
  /** The kept link, once: the caller opens it after sign-in. */
  take(): string | undefined {
    const path = pending;
    pending = undefined;
    return path;
  },
};
