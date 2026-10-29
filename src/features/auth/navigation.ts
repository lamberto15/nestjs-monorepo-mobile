import { router } from 'expo-router';

import type { Step } from '@/features/auth/sign-in-flow';

/**
 * Moves the sign-in flow to its next screen. `signedIn` needs nothing: the
 * root layout's guard leaves the signed-out screens on its own.
 */
export function goToStep(step: Step, tenantId?: string) {
  if (step === 'twoFactor') {
    router.push(
      tenantId
        ? { pathname: '/two-factor', params: { tenantId } }
        : '/two-factor',
    );
  } else if (step === 'chooseTenant') {
    router.push('/choose-tenant');
  }
}
