/**
 * A resumable upload (backend `…/attachments/sessions`, on every storage
 * driver): the file goes in chunks, each at the offset the server has
 * received so far. A chunk at a stale offset (409, e.g. a retry of one
 * that did land) or a dropped connection asks the server where it stands
 * and carries on from there. Cancelling deletes the session.
 */
import { isApiError } from '@/api/client';

export interface UploadSession {
  uploadId: string;
  size: number;
  received: number;
  chunkSize: number;
}

/** The calls an upload makes: the API's, or a test's. */
export interface UploadTransport<Done> {
  start(): Promise<UploadSession>;
  /** The bytes `[offset, offset + length)` of the file. */
  read(offset: number, length: number): Promise<Uint8Array>;
  send(
    uploadId: string,
    offset: number,
    bytes: Uint8Array,
  ): Promise<UploadSession>;
  progress(uploadId: string): Promise<UploadSession>;
  complete(uploadId: string): Promise<Done>;
  cancel(uploadId: string): Promise<unknown>;
}

/** Failures in a row (network, 5xx) before giving up. */
export const MAX_TRIES = 4;
const RETRY_AFTER_MS = 1_000;

/** Worth another try: no answer, or the server failed. A 4xx answers the same again. */
const transient = (error: unknown) => !isApiError(error) || error.status >= 500;

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

export async function uploadInChunks<Done>(
  transport: UploadTransport<Done>,
  {
    onProgress,
    signal,
  }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<Done> {
  let session = await transport.start();
  let failures = 0;
  try {
    while (session.received < session.size) {
      signal?.throwIfAborted();
      onProgress?.(session.received / session.size);
      try {
        const length = Math.min(
          session.chunkSize,
          session.size - session.received,
        );
        const bytes = await transport.read(session.received, length);
        session = await transport.send(
          session.uploadId,
          session.received,
          bytes,
        );
        failures = 0;
      } catch (error) {
        const stale = isApiError(error) && error.status === 409;
        if (!stale && !transient(error)) {
          throw error;
        }
        failures += 1;
        if (failures >= MAX_TRIES) {
          throw error;
        }
        if (!stale) {
          await wait(RETRY_AFTER_MS * failures);
        }
        // Where the server stands: what it received is not sent again.
        session = await transport.progress(session.uploadId);
      }
    }
    signal?.throwIfAborted();
    onProgress?.(1);
    return await transport.complete(session.uploadId);
  } catch (error) {
    if (signal?.aborted) {
      await transport.cancel(session.uploadId).catch(() => undefined);
    }
    throw error;
  }
}
