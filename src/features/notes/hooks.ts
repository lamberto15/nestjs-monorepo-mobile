/**
 * The Notes example feature: the pattern a project copies for its own
 * features (docs/adding-a-feature.md). Every call is the backend's generated
 * `notes` feature; replace `notes` and its fields with yours.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/api/api';
import { etagOf, isApiError, unwrap, type GetResponse } from '@/api/client';
import type { RecordRef } from '@/features/records/hooks';
import { stableQuery, type ListQuery } from '@/features/records/list';

export type Note = GetResponse<'/v1/notes/{id}'>;

/** A note as the record add-ons (comments, tags, revisions…) see it. */
export const noteRecord = (id: string): RecordRef => ({
  base: '/v1/notes',
  subject: 'Note',
  id,
});
export type NoteStatus = Note['status'];
export interface NoteInput {
  title: string;
  body: string;
  /** Custom field values by key; on an update only the keys sent change, null removes one. */
  custom?: Record<string, unknown>;
}

export const noteKeys = {
  all: ['notes'] as const,
  list: (query: ListQuery) => ['notes', 'list', stableQuery(query)] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
};

const PAGE_SIZE = 20;

/**
 * The list for a query (search, filters, a saved view's params): newest
 * change first unless it sorts, a page at a time; each note says what you
 * may do with it.
 */
export function useNotes(query: ListQuery) {
  return useInfiniteQuery({
    queryKey: noteKeys.list(query),
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET('/v1/notes', {
          params: {
            // Filters come from the list's metadata at runtime, so the
            // query is the route's as a string map, not its typed keys.
            query: {
              sort: '-updatedAt',
              ...stableQuery(query),
              limit: PAGE_SIZE,
              include: 'can',
              ...(pageParam && { cursor: pageParam }),
            } as never,
          },
          signal,
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/**
 * One note and its ETag: the version a PATCH or DELETE sends as `If-Match`,
 * so a change made meanwhile by someone else is refused (412) instead of
 * overwritten.
 */
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: async ({ signal }) => {
      const result = await api.GET('/v1/notes/{id}', {
        params: { path: { id }, query: { include: 'can,watching' } },
        signal,
      });
      return {
        note: await unwrap(Promise.resolve(result)),
        etag: etagOf(result),
      };
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) =>
      unwrap(api.POST('/v1/notes', { body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      etag,
    }: {
      input: NoteInput;
      etag?: string;
    }) => {
      const result = await api.PATCH('/v1/notes/{id}', {
        params: { path: { id }, header: { 'If-Match': etag } },
        body: input,
      });
      return {
        note: await unwrap(Promise.resolve(result)),
        etag: etagOf(result),
      };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(noteKeys.detail(id), saved);
      void queryClient.invalidateQueries({ queryKey: ['notes', 'list'] });
    },
  });
}

export function useDeleteNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (etag?: string) =>
      unwrap(
        api.DELETE('/v1/notes/{id}', {
          params: { path: { id }, header: { 'If-Match': etag } },
        }),
      ),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ['notes', 'list'] });
    },
  });
}

/** Someone else changed the note since it was read (`If-Match` refused). */
export const isConflict = (error: unknown) =>
  isApiError(error) && error.code === 'precondition_failed';
