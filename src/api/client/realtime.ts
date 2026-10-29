import {
  io,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from 'socket.io-client';
import type { GetResponse } from './client.js';
import type { RealtimeEventPayloads } from './realtime-events.js';

/** A notification as `GET /v1/notifications` lists it, and as the `notification` event carries it. */
export type NotificationItem =
  GetResponse<'/v1/notifications'>['items'][number];

/** `{ unread }`, as `GET /v1/notifications/unread-count` answers. */
export type UnreadCount = GetResponse<'/v1/notifications/unread-count'>;

/**
 * Every event the API pushes on `/realtime`, as a socket.io listener map. The
 * names and payloads are generated (`RealtimeEventPayloads`, from the OpenAPI
 * document's `x-realtime-events`: docs/webhooks-and-realtime.md, "Realtime
 * events"); a feature that adds an event declares it in the API's manifest
 * (`platform/realtime/realtime-events.ts`) and runs `pnpm client:generate`.
 */
export type RealtimeEvents = {
  [E in keyof RealtimeEventPayloads]: (event: RealtimeEventPayloads[E]) => void;
};

/** What a connection may ask the API. */
export interface RealtimeRequests {
  /** Who this connection acts as, and its rooms. */
  whoami: (
    ack: (answer: {
      kind: 'user' | 'client';
      id: string;
      rooms: string[];
    }) => void,
  ) => void;
}

export type RealtimeSocket = Socket<RealtimeEvents, RealtimeRequests>;

export interface RealtimeOptions {
  /** The API's origin (`https://api.example.com`); the namespace `/realtime` is added. */
  url: string;
  /**
   * An API key (`sk_…`) or a user access token. A function is asked on every
   * (re)connection, so a renewed token is used. Without one, the browser's
   * session cookie is sent (`withCredentials`).
   */
  token?: string | (() => string | Promise<string>);
  /** Anything else socket.io-client takes (`autoConnect`, `reconnectionDelay`…). */
  socket?: Partial<ManagerOptions & SocketOptions>;
}

export interface Realtime {
  /** The socket.io socket, typed with the API's events. */
  readonly socket: RealtimeSocket;
  on<E extends keyof RealtimeEvents>(
    event: E,
    handler: RealtimeEvents[E],
  ): () => void;
  off<E extends keyof RealtimeEvents>(
    event: E,
    handler: RealtimeEvents[E],
  ): void;
  /** Resolves once connected; rejects when the API refuses the connection. */
  connected(): Promise<void>;
  whoami(): Promise<{ kind: 'user' | 'client'; id: string; rooms: string[] }>;
  close(): void;
}

/**
 * `url` without its trailing slashes. A loop, not `replace(/\/+$/, '')`:
 * that regex is quadratic on a URL made of many slashes (CodeQL
 * js/polynomial-redos), and the URL is whatever the caller passes.
 */
export function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') {
    end--;
  }
  return url.slice(0, end);
}

/**
 * A connection to the API's realtime events (socket.io, `/realtime`), over
 * WebSocket only: no long-polling, so no sticky sessions needed.
 */
export function createRealtime(options: RealtimeOptions): Realtime {
  const { token } = options;
  const socket: RealtimeSocket = io(
    `${trimTrailingSlashes(options.url)}/realtime`,
    {
      transports: ['websocket'],
      ...(token === undefined
        ? { withCredentials: true }
        : {
            auth: (callback: (data: object) => void) => {
              void Promise.resolve(
                typeof token === 'function' ? token() : token,
              ).then(
                (value) => callback({ token: value }),
                () => callback({}),
              );
            },
          }),
      ...options.socket,
    },
  );

  return {
    socket,
    on(event, handler) {
      socket.on(event, handler as never);
      return () => socket.off(event, handler as never);
    },
    off(event, handler) {
      socket.off(event, handler as never);
    },
    connected() {
      if (socket.connected) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        const onConnect = () => {
          socket.off('connect_error', onError);
          resolve();
        };
        const onError = (error: Error) => {
          socket.off('connect', onConnect);
          reject(error);
        };
        socket.once('connect', onConnect);
        socket.once('connect_error', onError);
      });
    },
    whoami() {
      return socket.emitWithAck('whoami');
    },
    close() {
      socket.close();
    },
  };
}

export interface NotificationHandlers {
  /** A new notification: add it to the top of the list. */
  onItem?: (item: NotificationItem) => void;
  /**
   * The unread count changed: the bell's badge. `capped`: the count stopped
   * at its limit (1,000), so there are at least that many (show `1,000+`).
   */
  onUnread?: (unread: number, capped: boolean) => void;
  onRead?: (event: { id: string; readAt: string | null }) => void;
  onReadAll?: (event: { before: string | null; updated: number }) => void;
  onRemoved?: (id: string) => void;
}

/**
 * A bell icon's events, framework-agnostic: pass setters of your state. Load
 * the initial count with `GET /v1/notifications/unread-count`; the events
 * keep it current. Returns the function that stops listening.
 */
export function watchNotifications(
  realtime: Realtime,
  handlers: NotificationHandlers,
): () => void {
  const stops = [
    handlers.onItem && realtime.on('notification', handlers.onItem),
    handlers.onUnread &&
      realtime.on('notifications.unread-count', ({ unread, unreadCapped }) =>
        handlers.onUnread!(unread, unreadCapped),
      ),
    handlers.onRead && realtime.on('notification.read', handlers.onRead),
    handlers.onReadAll &&
      realtime.on('notifications.read-all', handlers.onReadAll),
    handlers.onRemoved &&
      realtime.on('notification.removed', ({ id }) => handlers.onRemoved!(id)),
  ];
  return () => {
    for (const stop of stops) {
      stop?.();
    }
  };
}
