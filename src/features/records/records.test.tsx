import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import {
  useAddComment,
  useWatch,
  type RecordRef,
} from '@/features/records/hooks';
import { changeLines, shownValue } from '@/features/records/revisions';
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

/** Any record type: the add-ons follow its own path. */
const task: RecordRef = { base: '/v1/tasks', subject: 'Task', id: 't1' };

test("the add-ons call the record type's own routes", async () => {
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': () =>
      reply({ accessToken: 'a', refreshToken: 'r2', expiresIn: 900 }),
    'POST /v1/tasks/t1/comments': () => reply({ id: 'c1' }, 201),
    'POST /v1/tasks/t1/watch': () => reply({ watching: true }),
  });

  const { result } = await renderHook(
    () => ({ comment: useAddComment(task), watch: useWatch(task) }),
    { wrapper },
  );
  await act(() =>
    result.current.comment.mutateAsync({ body: 'Hi', parentId: 'c0' }),
  );
  await act(() => result.current.watch.mutateAsync(true));

  expect(calls.slice(1).map((call) => `${call.method} ${call.path}`)).toEqual([
    'POST /v1/tasks/t1/comments',
    'POST /v1/tasks/t1/watch',
  ]);
  expect(calls[1].body).toEqual({ body: 'Hi', parentId: 'c0' });
});

test('a revision reads as "field: from → to"', () => {
  expect(
    changeLines({
      changes: {
        title: { from: 'Old', to: 'New' },
        body: { from: '', to: 'Text' },
        'custom.size': { from: null, to: 3 },
      },
    }),
  ).toEqual(['title: Old → New', 'body: — → Text', 'custom.size: — → 3']);
  expect(changeLines({ changes: null })).toEqual([]);
  expect(shownValue({ a: 1 })).toBe('{"a":1}');
});
