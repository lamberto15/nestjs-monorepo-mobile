import { router } from 'expo-router';

import { ApiError } from '@/api/client';
import {
  finishStepUp,
  StepUpCancelled,
  withStepUp,
} from '@/features/account/step-up';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const recentSignInNeeded = () =>
  new ApiError({ status: 403, code: 'reauthentication_required' });

/** Lets the pending promise chain run up to the step-up. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => jest.mocked(router.push).mockClear());

test('a stale sign-in opens the step-up, then the call runs again', async () => {
  const call = jest
    .fn()
    .mockRejectedValueOnce(recentSignInNeeded())
    .mockResolvedValueOnce('done');

  const result = withStepUp(call);
  await settle();
  expect(router.push).toHaveBeenCalledWith('/reauthenticate');
  finishStepUp(true);

  await expect(result).resolves.toBe('done');
  expect(call).toHaveBeenCalledTimes(2);
});

test('closing the step-up gives up without calling again', async () => {
  const call = jest.fn().mockRejectedValue(recentSignInNeeded());

  const result = withStepUp(call);
  await settle();
  finishStepUp(false);

  await expect(result).rejects.toBeInstanceOf(StepUpCancelled);
  expect(call).toHaveBeenCalledTimes(1);
});

test('any other error is not a step-up', async () => {
  const call = jest
    .fn()
    .mockRejectedValue(new ApiError({ status: 403, code: 'forbidden' }));

  await expect(withStepUp(call)).rejects.toMatchObject({ code: 'forbidden' });
  expect(router.push).not.toHaveBeenCalled();
});
