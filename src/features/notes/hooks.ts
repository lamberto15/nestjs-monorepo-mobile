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

export type Note = GetResponse<'/v1/notes/{id}'>;
export type NoteStatus = Note['status'];
export interface NoteInput {
  title: string;
  body: string;
}

export const noteKeys = {
  all: ['notes'] as const,
  list: (search: string, status: NoteStatus | 'all') =>
    ['notes', 'list', search, status] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
};

const PAGE_SIZE = 20;

/** The list: newest change first, a page at a time; each note says what you may do with it. */
export function useNotes(search: string, status: NoteStatus | 'all') {
  return useInfiniteQuery({
    queryKey: noteKeys.list(search, status),
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET('/v1/notes', {
          params: {
            query: {
              limit: PAGE_SIZE,
              sort: '-updatedAt',
              include: 'can',
              ...(search && { q: search }),
              ...(status !== 'all' && { status }),
              ...(pageParam && { cursor: pageParam }),
            },
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
        params: { path: { id }, query: { include: 'can' } },
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
