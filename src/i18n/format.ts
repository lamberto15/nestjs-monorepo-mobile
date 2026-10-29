import i18n from 'i18next';

/** A date and time for people, in the app's language and the device's time zone. */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
