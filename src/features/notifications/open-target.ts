import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { WEB_URL } from '@/api/public-api';
import { appRoute, linkUrl, recordRoute } from '@/features/notifications/link';

/** Something that leads to a record or a page: a notification, an inbox item, a search hit. */
export interface Target {
  subject?: string | null;
  recordId?: string | null;
  link?: string | null;
}

/** Whether `target` leads anywhere (a screen of this app, or the web app). */
export const canOpen = (target: Target) =>
  Boolean(
    recordRoute(target.subject, target.recordId) ??
    appRoute(target.link) ??
    linkUrl(target.link, WEB_URL),
  );

/** Opens it: this app's screen when it has one, else the web app in the browser. */
export function openTarget(target: Target) {
  const route =
    recordRoute(target.subject, target.recordId) ?? appRoute(target.link);
  if (route) {
    router.push(route as Href);
    return;
  }
  const url = linkUrl(target.link, WEB_URL);
  if (url) {
    void WebBrowser.openBrowserAsync(url);
  }
}
