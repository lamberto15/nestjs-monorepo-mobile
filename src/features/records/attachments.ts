/**
 * Files on a record (backend `attachments`): list, upload (resumable, in
 * chunks: `upload.ts`), open through a signed link, delete, and versions
 * (a new file, the earlier ones, restore). Uploads are scanned and get
 * renditions (thumbnails) after they land: until then the file is
 * `pending` and its download answers 409.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { useRef, useState } from 'react';

import { api } from '@/api/api';
import { ApiError, etagOf, unwrap, type GetResponse } from '@/api/client';
import { signedLink } from '@/api/signed-link';
import type { RecordRef } from '@/features/records/hooks';
import {
  uploadInChunks,
  type UploadTransport,
} from '@/features/records/upload';

export type Attachment =
  GetResponse<'/v1/notes/{id}/attachments'>['items'][number];

/** A picked file, from the camera, the photo library or the files app. */
export interface PickedFile {
  uri: string;
  name: string;
  size?: number | null;
  /** What the picker says it is; the server checks it against the bytes. */
  mimeType?: string | null;
}

export type AttachmentVersion =
  GetResponse<'/v1/attachments/{id}/versions'>['items'][number];

const key = (ref: RecordRef) =>
  ['records', ref.subject, ref.id, 'attachments'] as const;

/** Whether a picked file is over the type's limit (`attachmentLimits.maxBytes`). */
export const tooLarge = (file: PickedFile, maxBytes: number | undefined) =>
  Boolean(maxBytes && file.size && file.size > maxBytes);

export function useAttachments(ref: RecordRef) {
  return useInfiniteQuery({
    queryKey: key(ref),
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET(
          // Same shape on every record type: the Notes path types them all.
          `${ref.base}/{id}/attachments` as '/v1/notes/{id}/attachments',
          {
            params: {
              path: { id: ref.id },
              query: { limit: 50, ...(pageParam && { cursor: pageParam }) },
            },
          },
        ),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // A file being checked or rendered: look again shortly.
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.items.some(
          (item) =>
            item.scanStatus === 'pending' || item.renditionStatus === 'pending',
        ),
      )
        ? 4000
        : false,
  });
}

// The record type's paths, typed by the Notes ones (same shape on every type).
const SESSIONS = '/v1/notes/{id}/attachments/sessions';
const SESSION = '/v1/notes/{id}/attachments/sessions/{uploadId}';
const COMPLETE = '/v1/notes/{id}/attachments/complete';
const typed = <Path extends string>(ref: RecordRef, path: Path) =>
  path.replace('/v1/notes', ref.base) as Path;

/** The API's side of a resumable upload of `picked` to `ref`. */
function sessionTransport(
  ref: RecordRef,
  picked: PickedFile,
): UploadTransport<Attachment> {
  const file = new File(picked.uri);
  const path = { id: ref.id };
  return {
    start: () =>
      unwrap(
        api.POST(typed(ref, SESSIONS), {
          params: { path },
          body: {
            name: picked.name,
            size: picked.size ?? file.size,
            contentType: picked.mimeType ?? 'application/octet-stream',
          },
        }),
      ),
    async read(offset, length) {
      const handle = file.open();
      try {
        handle.offset = offset;
        return await handle.readBytes(length);
      } finally {
        handle.close();
      }
    },
    send: (uploadId, offset, bytes) =>
      unwrap(
        api.PUT(typed(ref, SESSION), {
          params: { path: { ...path, uploadId }, query: { offset } },
          body: bytes as never, // raw bytes, not JSON
          bodySerializer: (body) => body,
          headers: { 'Content-Type': 'application/octet-stream' },
        }),
      ),
    progress: (uploadId) =>
      unwrap(
        api.GET(typed(ref, SESSION), {
          params: { path: { ...path, uploadId } },
        }),
      ),
    complete: (uploadId) =>
      unwrap(
        api.POST(typed(ref, COMPLETE), {
          params: { path },
          body: { uploadId },
        }),
      ),
    cancel: (uploadId) =>
      unwrap(
        api.DELETE(typed(ref, SESSION), {
          params: { path: { ...path, uploadId } },
        }),
      ),
  };
}

/** Uploads in chunks, with `progress` (0 to 1, null when idle) and `cancel`. */
export function useUploadAttachment(ref: RecordRef) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (picked: PickedFile) => {
      controller.current = new AbortController();
      try {
        return await uploadInChunks(sessionTransport(ref, picked), {
          onProgress: setProgress,
          signal: controller.current.signal,
        });
      } finally {
        setProgress(null);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(ref) }),
  });
  return {
    ...mutation,
    progress,
    cancel: () => controller.current?.abort(),
  };
}

/** Cancelled by the person: nothing to report. */
export const isCancelled = (error: unknown) =>
  error instanceof Error && error.name === 'AbortError';

/**
 * The attachment's ETag, if it is still the version on screen: a change
 * meanwhile (someone else's new version) is a conflict, as a 412 would be.
 */
async function currentEtag(attachment: Attachment): Promise<string> {
  const result = await api.GET('/v1/attachments/{id}', {
    params: { path: { id: attachment.id } },
  });
  const now = await unwrap(Promise.resolve(result));
  if (now.version !== attachment.version) {
    throw new ApiError({ status: 412, code: 'precondition_failed' });
  }
  return etagOf(result) ?? '*';
}

export function useVersions(attachment: Attachment, enabled: boolean) {
  return useQuery({
    queryKey: ['attachments', attachment.id, 'versions', attachment.version],
    queryFn: () =>
      unwrap(
        api.GET('/v1/attachments/{id}/versions', {
          params: { path: { id: attachment.id } },
        }),
      ),
    enabled,
  });
}

/** A new file for an attachment; the old one stays as a version. */
export function useNewVersion(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attachment,
      picked,
    }: {
      attachment: Attachment;
      picked: PickedFile;
    }) => {
      const etag = await currentEtag(attachment);
      const form = new FormData();
      form.append('file', new File(picked.uri), picked.name);
      return unwrap(
        api.POST(
          typed(ref, '/v1/notes/{id}/attachments/{attachmentId}/versions'),
          {
            params: {
              path: { id: ref.id, attachmentId: attachment.id },
              header: { 'If-Match': etag },
            },
            body: form as never, // multipart: the typed body is the JSON shape
          },
        ),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(ref) }),
  });
}

/** An earlier version becomes the current file again (as a new version). */
export function useRestoreVersion(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attachment,
      version,
    }: {
      attachment: Attachment;
      version: number;
    }) =>
      unwrap(
        api.POST('/v1/attachments/{id}/versions/{version}/restore', {
          params: {
            path: { id: attachment.id, version },
            header: { 'If-Match': await currentEtag(attachment) },
          },
          body: {},
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(ref) }),
  });
}

/** One version's file. */
export const versionLink = (attachment: Attachment, version: number) =>
  signedLink(`/v1/attachments/${attachment.id}/versions/${version}/download`);

export function useDeleteAttachment(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/v1/attachments/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(ref) }),
  });
}

/** A thumbnail's signed link (valid 5 minutes: kept for 4). */
export function useThumbnail(attachment: Attachment) {
  const ready =
    attachment.contentType.startsWith('image/') &&
    attachment.scanStatus === 'clean' &&
    attachment.renditionStatus === 'ready';
  return useQuery({
    queryKey: ['attachments', attachment.id, 'thumb', attachment.version],
    queryFn: () =>
      signedLink(`/v1/attachments/${attachment.id}/download?rendition=thumb`),
    enabled: ready,
    staleTime: 4 * 60_000,
  });
}

/** The file to open (inline when the browser can show it). */
export const openLink = (attachment: Attachment) =>
  signedLink(`/v1/attachments/${attachment.id}/download?inline=true`);

/** "2.4 MB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
