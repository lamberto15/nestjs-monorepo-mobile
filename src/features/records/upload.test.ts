import { ApiError } from '@/api/client';
import {
  MAX_TRIES,
  uploadInChunks,
  type UploadSession,
  type UploadTransport,
} from '@/features/records/upload';

/** A server that stores what it's sent, and a transport that can fail on cue. */
function fakeServer(size: number, chunkSize: number) {
  const file = Uint8Array.from({ length: size }, (_, i) => i % 256);
  const stored: number[] = [];
  const session = (): UploadSession => ({
    uploadId: 'u1',
    size,
    received: stored.length,
    chunkSize,
  });
  const failures: (() => Error | null)[] = [];
  const transport: UploadTransport<string> & { cancelled: boolean } = {
    cancelled: false,
    start: async () => session(),
    read: async (offset, length) => file.slice(offset, offset + length),
    send: async (_id, offset, bytes) => {
      const failure = failures.shift()?.();
      if (failure) {
        throw failure;
      }
      if (offset !== stored.length) {
        throw new ApiError({
          status: 409,
          code: 'attachment_upload_offset_mismatch',
        });
      }
      stored.push(...bytes);
      return session();
    },
    progress: async () => session(),
    complete: async () => 'attached',
    cancel: async () => {
      transport.cancelled = true;
    },
  };
  return { file, stored, transport, failures };
}

test('sends the file in chunks, then completes', async () => {
  const server = fakeServer(10, 4);
  const progress: number[] = [];
  await expect(
    uploadInChunks(server.transport, { onProgress: (p) => progress.push(p) }),
  ).resolves.toBe('attached');
  expect(server.stored).toEqual([...server.file]);
  expect(progress).toEqual([0, 0.4, 0.8, 1]);
});

test('a dropped connection resumes where the server stands', async () => {
  jest.useFakeTimers();
  const server = fakeServer(10, 4);
  server.failures.push(
    () => null,
    () => new TypeError('Network request failed'),
  );
  const done = uploadInChunks(server.transport);
  await jest.runAllTimersAsync();
  await expect(done).resolves.toBe('attached');
  expect(server.stored).toEqual([...server.file]); // nothing sent twice
  jest.useRealTimers();
});

test('a chunk that landed but whose answer was lost is not sent again', async () => {
  const server = fakeServer(8, 4);
  // The first chunk lands, its answer is lost: the retry at offset 0 is stale.
  const send = server.transport.send;
  let lost = true;
  server.transport.send = async (id, offset, bytes) => {
    const answer = await send(id, offset, bytes);
    if (lost) {
      lost = false;
      throw new TypeError('Network request failed');
    }
    return answer;
  };
  jest.useFakeTimers();
  const done = uploadInChunks(server.transport);
  await jest.runAllTimersAsync();
  await expect(done).resolves.toBe('attached');
  expect(server.stored).toEqual([...server.file]);
  jest.useRealTimers();
});

test('gives up after repeated failures, and on a refusal at once', async () => {
  jest.useFakeTimers();
  const flaky = fakeServer(8, 4);
  for (let i = 0; i < MAX_TRIES; i += 1) {
    flaky.failures.push(() => new TypeError('Network request failed'));
  }
  const done = uploadInChunks(flaky.transport);
  const failed = expect(done).rejects.toThrow('Network request failed');
  await jest.runAllTimersAsync();
  await failed;
  jest.useRealTimers();

  const expired = fakeServer(8, 4);
  expired.failures.push(
    () => new ApiError({ status: 410, code: 'attachment_upload_expired' }),
  );
  await expect(uploadInChunks(expired.transport)).rejects.toMatchObject({
    status: 410,
  });
});

test('cancelling deletes the session', async () => {
  const server = fakeServer(8, 4);
  const controller = new AbortController();
  server.transport.read = async (offset, length) => {
    controller.abort();
    return server.file.slice(offset, offset + length);
  };
  await expect(
    uploadInChunks(server.transport, { signal: controller.signal }),
  ).rejects.toThrow();
  expect(server.transport.cancelled).toBe(true);
});
