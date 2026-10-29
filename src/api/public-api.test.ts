import { appFetch, REQUEST_TIMEOUT_MS, USER_AGENT } from '@/api/public-api';

/** A server that never answers; the request ends only when aborted. */
function hangingServer() {
  const requests: { request: Request; signal: AbortSignal }[] = [];
  globalThis.fetch = jest.fn(
    (request: Request, init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        requests.push({ request, signal: init.signal! });
        init.signal!.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
        );
      }),
  ) as unknown as typeof fetch;
  return requests;
}

afterEach(() => jest.useRealTimers());

test('a request still unanswered after the timeout fails', async () => {
  jest.useFakeTimers();
  const requests = hangingServer();

  const call = appFetch('http://api.test/v1/notes');
  jest.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
  expect(requests[0].signal.aborted).toBe(false);
  jest.advanceTimersByTime(1);

  await expect(call).rejects.toMatchObject({ name: 'AbortError' });
});

test("the caller's cancel still aborts it, and it says who calls", async () => {
  const requests = hangingServer();
  const caller = new AbortController();

  const call = appFetch('http://api.test/v1/notes', { signal: caller.signal });
  caller.abort();

  await expect(call).rejects.toMatchObject({ name: 'AbortError' });
  expect(requests[0].request.headers.get('User-Agent')).toBe(USER_AGENT);
});
