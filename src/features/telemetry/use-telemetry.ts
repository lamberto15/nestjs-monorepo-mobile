import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useConsentKinds, useConsents } from '@/features/account/lifecycle';
import {
  ANALYTICS_CONSENT_KIND,
  screenPath,
  telemetry,
} from '@/features/telemetry/telemetry';

/**
 * Signed in: telemetry follows the account's analytics consent (off when
 * the backend declares no such kind, or it was not given at the current
 * version), and each screen opened is a `screen_view` (its route, ids
 * removed). Leaving the signed-in app turns it off.
 */
export function useTelemetry() {
  const kinds = useConsentKinds();
  const consents = useConsents();
  const pathname = usePathname();

  const kind = kinds.data?.items.find(
    (item) => item.kind === ANALYTICS_CONSENT_KIND,
  );
  const given = consents.data?.items.find(
    (item) =>
      item.kind === ANALYTICS_CONSENT_KIND &&
      !item.withdrawnAt &&
      item.version === kind?.version,
  );
  const consented = Boolean(kind && given);

  useEffect(() => {
    telemetry.setConsent(consented);
    return () => telemetry.setConsent(false);
  }, [consented]);

  useEffect(() => {
    telemetry.track('screen_view', { path: screenPath(pathname) });
  }, [pathname, consented]);
}
