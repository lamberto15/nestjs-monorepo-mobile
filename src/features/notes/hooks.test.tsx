import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import {
  isConflict,
  useNote,
  useUpdateNote,
  type Note,
} from '@/features/notes/hooks';
import { fakeApi, problem, reply } from '@/test/fake-api';

const note = (title: string): Note => ({
  id: 'n1',
  number: 'NOTE-1',
  ownerId: 'u1',
  unitId: null,
  title,
  body: '',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  deletedBy: null,
  publishedAt: null,
  tags: [],
  can: { update: true, delete: true, restore: false, issue: false },
});

const withEtag = (body: unknown, etag: string) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ETag: etag },
  });

/** Signed in: the first request renews the access token from this one. */
beforeAll(() => SecureStore.setItemAsync('session.refreshToken', 'r1'));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    // No retries, and no cache-cleanup timers left to keep Jest running.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const refresh = () =>
  reply({ accessToken: 'a', refreshToken: 'r2', expiresIn: 900 });

test('an edit sends the version it read as If-Match, and keeps the new one', async () => {
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': refresh,
    'GET /v1/notes/n1': () => withEtag(note('Old'), '"v1"'),
    'PATCH /v1/notes/n1': () => withEtag(note('New'), '"v2"'),
  });

  const { result } = await renderHook(
    () => ({ read: useNote('n1'), update: useUpdateNote('n1') }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.read.data?.etag).toBe('"v1"'));

  await act(() =>
    result.current.update.mutateAsync({
      input: { title: 'New', body: '' },
      etag: result.current.read.data?.etag,
    }),
  );

  const patch = calls.find((call) => call.method === 'PATCH');
  expect(patch?.headers.get('If-Match')).toBe('"v1"');
  expect(patch?.body).toEqual({ title: 'New', body: '' });
  await waitFor(() =>
    expect(result.current.read.data).toMatchObject({
      etag: '"v2"',
      note: { title: 'New' },
    }),
  );
});

test('a version changed meanwhile is a conflict, not an overwrite', async () => {
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': refresh,
    'PATCH /v1/notes/n1': () => problem(412, 'precondition_failed'),
  });

  const { result } = await renderHook(() => useUpdateNote('n1'), { wrapper });
  await act(() =>
    result.current
      .mutateAsync({ input: { title: 'Mine', body: '' }, etag: '"v1"' })
      .catch(() => undefined),
  );

  await waitFor(() => expect(isConflict(result.current.error)).toBe(true));
  const patches = calls.filter((call) => call.method === 'PATCH');
  expect(patches).toHaveLength(1);
  expect(patches[0].headers.get('If-Match')).toBe('"v1"');
});
