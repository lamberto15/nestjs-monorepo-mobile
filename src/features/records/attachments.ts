/**
 * Files on a record (backend `attachments`): list, upload (multipart, the
 * field `file`), open through a signed link, delete. Uploads are scanned
 * and get renditions (thumbnails) after they land: until then the file is
 * `pending` and its download answers 409.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { File } from 'expo-file-system';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';
import { signedLink } from '@/api/signed-link';
import type { RecordRef } from '@/features/records/hooks';

export type Attachment =
  GetResponse<'/v1/notes/{id}/attachments'>['items'][number];

/** A picked file, from the camera, the photo library or the files app. */
export interface PickedFile {
  uri: string;
  name: string;
  size?: number | null;
}

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

export function useUploadAttachment(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (picked: PickedFile) => {
      const form = new FormData();
      form.append('file', new File(picked.uri), picked.name);
      return unwrap(
        api.POST(
          `${ref.base}/{id}/attachments` as '/v1/notes/{id}/attachments',
          {
            params: { path: { id: ref.id } },
            body: form as never, // multipart: the typed body is the JSON shape
          },
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(ref) }),
  });
}

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
