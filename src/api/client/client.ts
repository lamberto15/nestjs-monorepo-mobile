import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { ApiError } from './problem.js';
import type { paths } from './schema.js';

/**
 * How the client authenticates (docs/api-conventions.md, "Credentials"):
 *
 * - `'include'`: a browser on the user's session cookie (`POST
 *   /v1/auth/sign-in` set it); every request is sent with `credentials:
 *   'include'`, so it works from another origin listed in CORS_ORIGINS.
 * - `{ apiKey }`: a system, with an API client's `sk_<id>_<secret>`.
 * - `{ token }`: a mobile app or CLI, with a user access token (`POST
 *   /v1/auth/token`). A function is called before every request, so it can
 *   return a renewed token (they last 15 minutes).
 */
export type Credentials =
  | 'include'
  | { apiKey: string }
  | { token: string | (() => string | Promise<string>) };

export interface ApiClientOptions {
  /** The API's origin, `https://api.example.com` (paths carry `/v1`). */
  baseUrl: string;
  credentials?: Credentials;
  /**
   * A fetch of your own (a polyfill, an instrumented one, a test double).
   * Default: `globalThis.fetch`, looked up on every request (openapi-fetch
   * itself keeps the one it sees at creation), so a fetch replaced later
   * (msw, instrumentation) is used.
   */
  fetch?: typeof globalThis.fetch;
  /** Sent as `Accept-Language`: used when the user saved no language. */
  language?: string;
  /** Sent as `X-Lang`: wins over the user's saved language. */
  lang?: string;
  /** Makes the `Idempotency-Key` of a POST that sets none (default: `crypto.randomUUID()`). */
  idempotencyKey?: () => string;
}

/** The JSON a path's `GET` answers with on 200. */
export type GetResponse<P extends keyof paths> = paths[P] extends {
  get: { responses: { 200: { content: { 'application/json': infer T } } } };
}
  ? T
  : never;

/** The query parameters of a path's `GET`. */
export type GetQuery<P extends keyof paths> = paths[P] extends {
  get: { parameters: { query?: infer Q } };
}
  ? NonNullable<Q>
  : never;

/** The paths whose `GET` pages by cursor: `{ items, nextCursor }`. */
export type CursorPath = {
  [P in keyof paths]: GetResponse<P> extends {
    items: unknown[];
    nextCursor?: string | null;
  }
    ? GetQuery<P> extends { cursor?: string }
      ? P
      : never
    : never;
}[keyof paths];

/** An item of a cursor-paged list. */
export type ItemOf<P extends CursorPath> =
  GetResponse<P> extends { items: (infer I)[] } ? I : never;

export type ApiClient = Client<paths> & {
  /**
   * Every page of a cursor-paged list, in order: it follows `nextCursor`
   * until it is null. `query` is the first request's (filters, `sort`,
   * `limit`); `count=true` is worth sending once, it counts on every page.
   *
   *   for await (const page of api.pages('/v1/notes', { limit: '100' })) …
   */
  pages<P extends CursorPath>(
    path: P,
    query?: Omit<GetQuery<P>, 'cursor' | 'page'>,
  ): AsyncGenerator<GetResponse<P>, void, undefined>;
  /** Every item of a cursor-paged list, page after page. */
  items<P extends CursorPath>(
    path: P,
    query?: Omit<GetQuery<P>, 'cursor' | 'page'>,
  ): AsyncGenerator<ItemOf<P>, void, undefined>;
};

/** The `Authorization` header a credential sends, if any. */
export async function authorizationFor(
  credentials: Credentials | undefined,
): Promise<string | undefined> {
  if (!credentials || credentials === 'include') {
    return undefined;
  }
  if ('apiKey' in credentials) {
    return `Bearer ${credentials.apiKey}`;
  }
  const token =
    typeof credentials.token === 'function'
      ? await credentials.token()
      : credentials.token;
  return `Bearer ${token}`;
}

/**
 * The conventions every request follows: credentials, language, a fresh
 * `Idempotency-Key` on every POST that sets none, and problem details
 * thrown as ApiError.
 */
export function conventionsMiddleware(options: ApiClientOptions): Middleware {
  const newKey = options.idempotencyKey ?? (() => crypto.randomUUID());
  return {
    async onRequest({ request }) {
      const authorization = await authorizationFor(options.credentials);
      if (authorization && !request.headers.has('authorization')) {
        request.headers.set('authorization', authorization);
      }
      if (options.language && !request.headers.has('accept-language')) {
        request.headers.set('accept-language', options.language);
      }
      if (options.lang && !request.headers.has('x-lang')) {
        request.headers.set('x-lang', options.lang);
      }
      // Every POST: the routes that take a key (`@Idempotent()`) run it once,
      // the others ignore it. A retry of the same operation must send the same
      // key: pass `params: { header: { 'Idempotency-Key': key } }` then.
      if (
        request.method === 'POST' &&
        !request.headers.has('idempotency-key')
      ) {
        request.headers.set('idempotency-key', newKey());
      }
      return request;
    },
    async onResponse({ response }) {
      // 304 answers an If-None-Match: not an error (see notModified()).
      if (!response.ok && response.status !== 304) {
        throw await ApiError.fromResponse(response);
      }
      return undefined;
    },
  };
}

/** `globalThis.fetch`, looked up at each call rather than when the client is made. */
const lateBoundFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, init);

/**
 * A typed client of the API (openapi-fetch on the generated `paths`).
 *
 * Calls return openapi-fetch's `{ data, response }`; an answer that isn't
 * 2xx or 304 is thrown as an {@link ApiError} (the problem details), so
 * `error` is never set. `unwrap()` turns a call into its data.
 *
 *   const api = createApiClient({ baseUrl, credentials: { apiKey } });
 *   const note = await unwrap(api.POST('/v1/notes', { body: { title, body } }));
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    // Late-bound: createClient() would capture globalThis.fetch as it is now.
    fetch: options.fetch ?? lateBoundFetch,
    ...(options.credentials === 'include' && { credentials: 'include' }),
  });
  client.use(conventionsMiddleware(options));

  async function* pages(path: string, query: Record<string, unknown> = {}) {
    let cursor: string | undefined;
    do {
      const { data } = await (
        client.GET as unknown as (
          path: string,
          init: { params: { query: Record<string, unknown> } },
        ) => Promise<{
          data?: { items: unknown[]; nextCursor?: string | null };
        }>
      )(path, { params: { query: { ...query, ...(cursor && { cursor }) } } });
      if (!data) {
        return;
      }
      yield data;
      cursor = data.nextCursor ?? undefined;
    } while (cursor);
  }

  async function* items(path: string, query?: Record<string, unknown>) {
    for await (const page of pages(path, query)) {
      yield* page.items;
    }
  }

  return Object.assign(client, { pages, items }) as unknown as ApiClient;
}

/**
 * The data of a call. A 2xx without a body (204: sign-out, deletes, `POST
 * /v1/auth/tenant`) gives `undefined`, which is also what openapi-fetch
 * types the data of such an operation as, so `unwrap()` of it is
 * `Promise<undefined>` and needs no second function. A 304 throws
 * `not_modified` (see {@link notModified}); an answer that is not 2xx never
 * gets here, the client throws its {@link ApiError} first.
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; response: Response }>,
): Promise<T> {
  const { data, response } = await call;
  if (data === undefined && !response.ok) {
    throw new ApiError({
      status: response.status,
      code: response.status === 304 ? 'not_modified' : 'empty_response',
      detail: `No body (HTTP ${response.status}).`,
    });
  }
  return data as T;
}

/** A response's `ETag`: send it back as `If-Match` (writes) or `If-None-Match` (reads). */
export function etagOf(
  result: { response: Response } | Response,
): string | undefined {
  const response = result instanceof Response ? result : result.response;
  return response.headers.get('etag') ?? undefined;
}

/**
 * Whether a read sent with `If-None-Match` came back 304: nothing changed,
 * keep what you have (`data` is undefined then).
 */
export function notModified(result: { response: Response }): boolean {
  return result.response.status === 304;
}
