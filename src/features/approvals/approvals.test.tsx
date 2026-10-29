import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import { allowedDecisions, useDecide } from '@/features/approvals/hooks';
import { appRoute, recordRoute } from '@/features/notifications/link';
import { fakeApi, reply } from '@/test/fake-api';

beforeAll(() => SecureStore.setItemAsync('session.refreshToken', 'r1'));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

test('the decisions offered follow what `can` allows', () => {
  const none = {
    decide: false,
    cancel: false,
    resubmit: false,
    abandon: false,
  };
  expect(allowedDecisions({ ...none, decide: true })).toEqual([
    'approve',
    'request-changes',
    'reject',
  ]);
  expect(allowedDecisions({ ...none, cancel: true, resubmit: true })).toEqual([
    'resubmit',
    'cancel',
  ]);
  expect(allowedDecisions(none)).toEqual([]);
});

test('a reject goes to its route with the reason and the ETag as If-Match', async () => {
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': () =>
      reply({ accessToken: 'a', refreshToken: 'r2', expiresIn: 900 }),
    'POST /v1/approvals/ap1/reject': () => reply({ id: 'ap1' }),
  });

  const { result } = await renderHook(() => useDecide('ap1'), { wrapper });
  await act(() =>
    result.current.mutateAsync({
      decision: 'reject',
      comment: '  Not this quarter ',
      etag: '"e1"',
    }),
  );

  const reject = calls.find((call) => call.path === '/v1/approvals/ap1/reject');
  expect(reject?.body).toEqual({ comment: 'Not this quarter' });
  expect(reject?.headers.get('If-Match')).toBe('"e1"');
});

test('approvals open in the app from links and inbox items', () => {
  expect(appRoute('/approvals/ap1')).toBe('/approvals/ap1');
  expect(recordRoute('Approval', 'ap1')).toBe('/approvals/ap1');
});
