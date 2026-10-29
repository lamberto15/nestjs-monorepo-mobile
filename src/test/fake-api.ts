/**
 * A stand-in for the API in tests: answers `fetch` by method and path, and
 * records every call. `reply` gives JSON; `problem` an RFC 9457 error.
 * Install it after loading the modules under test: loading `expo` sets its
 * own global fetch.
 */
export interface Call {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

type Handler = (call: Call) => Response | Promise<Response>;

export const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const problem = (status: number, code: string, detail = code) =>
  new Response(JSON.stringify({ status, code, detail }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });

export function fakeApi(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const text = await request.text();
      const call: Call = {
        method: request.method,
        path: new URL(request.url).pathname,
        body: text ? JSON.parse(text) : undefined,
        authorization: request.headers.get('Authorization'),
      };
      calls.push(call);
      const handler = routes[`${call.method} ${call.path}`];
      if (!handler) {
        throw new Error(`No fake for ${call.method} ${call.path}`);
      }
      return handler(call);
    },
  ) as typeof fetch;
  return calls;
}

/** A promise to settle later, for "while a refresh is in flight". */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
