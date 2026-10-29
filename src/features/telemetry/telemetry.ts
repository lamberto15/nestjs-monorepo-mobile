/**
 * Telemetry, off by default: no vendor is chosen by the template. A project
 * plugs its analytics in with `telemetry.use(sink)`; events then go to it
 * only while the person has agreed (the account's consent of kind
 * `analytics`, `GET /v1/account/consents`), scrubbed of anything personal.
 * Without a sink or a consent, `track` does nothing.
 */

export type EventProps = Record<string, string | number | boolean | null>;

export interface TelemetrySink {
  track(event: string, props: EventProps): void;
}

/** The consent kind the backend declares for analytics (CONSENT_KINDS). */
export const ANALYTICS_CONSENT_KIND = 'analytics';

/** Keys that never leave the app, whatever their value. */
const PERSONAL_KEY = /token|password|secret|e-?mail|phone|code|name|address/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const JWT = /^ey[\w-]+\.[\w-]+\.[\w-]+$/;
const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f-]{27}|\d+|[0-9A-Z]{26})$/i;

/** Event properties without personal data: personal keys dropped, emails and tokens cut. */
export function scrub(props: EventProps): EventProps {
  return Object.fromEntries(
    Object.entries(props)
      .filter(([key]) => !PERSONAL_KEY.test(key))
      .map(([key, value]) =>
        typeof value === 'string' && (EMAIL.test(value) || JWT.test(value))
          ? [key, '[removed]']
          : [key, value],
      ),
  );
}

/** A route for a screen view: record ids become `:id` (`/notes/:id`). */
export function screenPath(path: string): string {
  return path
    .split('?')[0]
    .split('/')
    .map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/');
}

let sink: TelemetrySink | null = null;
let consented = false;

export const telemetry = {
  /** Plugs a project's analytics in (or out, with null). */
  use(next: TelemetrySink | null) {
    sink = next;
  },
  /** The person's consent; false on sign-out. */
  setConsent(on: boolean) {
    consented = on;
  },
  isOn: () => Boolean(sink) && consented,
  track(event: string, props: EventProps = {}) {
    if (sink && consented) {
      sink.track(event, scrub(props));
    }
  },
};
