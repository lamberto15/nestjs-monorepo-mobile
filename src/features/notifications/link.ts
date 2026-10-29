/**
 * Where a notification's `link` opens: an absolute http(s) URL as it is, a
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
