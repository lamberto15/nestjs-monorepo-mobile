/**
 * Step-up: a sensitive route (change password, two-factor, delete the
 * account…) answers 403 `reauthentication_required` when the sign-in isn't
 * recent. `withStepUp(call)` then opens the re-authentication screen and,
 * once the person proved it's them, runs the call again.
 */
import { router } from 'expo-router';

import { isApiError } from '@/api/client';

/** The person closed the re-authentication screen without proving it. */
export class StepUpCancelled extends Error {
  override readonly name = 'StepUpCancelled';
}

let waiting: { resolve: () => void; reject: (error: Error) => void } | null =
  null;

function stepUp(): Promise<void> {
  waiting?.reject(new StepUpCancelled());
  return new Promise((resolve, reject) => {
    waiting = { resolve, reject };
    router.push('/reauthenticate');
  });
}

/** The re-authentication screen: proved (`true`) or closed (`false`). */
export function finishStepUp(proved: boolean) {
  if (proved) {
    waiting?.resolve();
  } else {
    waiting?.reject(new StepUpCancelled());
  }
  waiting = null;
}

export const needsStepUp = (error: unknown) =>
  isApiError(error) && error.code === 'reauthentication_required';

export async function withStepUp<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!needsStepUp(error)) {
      throw error;
    }
    await stepUp();
    return call();
  }
}
