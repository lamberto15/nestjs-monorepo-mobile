/**
 * The app's detail screen per record subject: what inbox items, recents,
 * favorites and search results open. Add a feature's here.
 */
const RECORD_ROUTES: Record<string, (id: string) => string> = {
  Note: (id) => `/notes/${id}`,
  Approval: (id) => `/approvals/${id}`,
};

/** A record's screen in this app, if it has one. */
export function recordRoute(
  subject: string | null | undefined,
  id: string | null | undefined,
): string | undefined {
  return subject && id
    ? RECORD_ROUTES[subject]?.(encodeURIComponent(id))
    : undefined;
}

/**
 * The app's own screens a link may open, as web app paths: the web app and
 * this app share them (`/notes/{id}`). Add a feature's detail route here.
 */
const APP_ROUTES = [/^\/notes\/[\w-]+$/, /^\/approvals\/[\w-]+$/];

/** A link's path when this app has the screen for it. */
export function appRoute(link: string | null | undefined): string | undefined {
  const path = link?.split(/[?#]/)[0];
  return path && APP_ROUTES.some((route) => route.test(path))
    ? path
    : undefined;
}

/**
 * Where a notification's `link` opens in the browser: an absolute http(s) URL as it is, a
 * web app path (`/notes/123`) on `webUrl`. Nothing without a web app, or for
 * anything else (no `javascript:` or custom schemes from the API).
 */
export function linkUrl(
  link: string | null | undefined,
  webUrl: string | undefined,
): string | undefined {
  if (!link) {
    return undefined;
  }
  if (/^https?:\/\//i.test(link)) {
    return link;
  }
  if (link.startsWith('/') && !link.startsWith('//') && webUrl) {
    return `${webUrl.replace(/\/+$/, '')}${link}`;
  }
  return undefined;
}
