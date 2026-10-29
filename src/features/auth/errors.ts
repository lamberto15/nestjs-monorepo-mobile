import type { TFunction } from 'i18next';

import { isApiError } from '@/api/client';

/** What to show for a failed call: the API's own message (in the user's language), or ours. */
export function apiErrorMessage(error: unknown, t: TFunction): string {
  if (isApiError(error)) {
    if (error.code === 'captcha_required' || error.code === 'captcha_invalid') {
      // Apps can't pass the bot check yet: docs/backend-integration.md, "Bot protection".
      return t('errors.captcha');
    }
    return error.detail;
  }
  if (error instanceof TypeError) {
    return t('errors.network'); // fetch failed: offline, or the API is down
  }
  return t('errors.unknown');
}

/** A `validation_failed` problem's message for one field, if any. */
export function fieldError(error: unknown, field: string): string | undefined {
  if (!isApiError(error)) {
    return undefined;
  }
  return error.errors?.find(
    (item) => item.path === field || item.path === `/${field}`,
  )?.message;
}

/** The first message of a TanStack Form field's errors (zod issues or strings). */
export function firstError(errors: readonly unknown[]): string | undefined {
  const first = errors.find(Boolean);
  if (typeof first === 'string') {
    return first;
  }
  if (first && typeof first === 'object' && 'message' in first) {
    return String(first.message);
  }
  return undefined;
}
