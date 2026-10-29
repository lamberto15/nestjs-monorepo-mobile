/**
 * Record add-ons (backend `comments`, `tags`, `favorites`, `revisions`):
 * the same routes on every record type, under the record's own path
 * (`/v1/notes/{id}/comments`). Built once here for any record; the Notes
 * detail mounts them.
 *
 * The typed client knows each path literally; every record type's add-on
 * routes have the same shape, so the Notes paths type them all (`path()`).
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';

/** A record an add-on hangs on: its API path, its subject and its id. */
export interface RecordRef {
  /** The record type's route, `/v1/notes`. */
  base: `/v1/${string}`;
  /** The permission subject, `Note`. */
  subject: string;
  id: string;
}

export type Comment = GetResponse<'/v1/notes/{id}/comments'>['items'][number];
export type Tag = GetResponse<'/v1/tags'>['items'][number];
export type Revision = GetResponse<'/v1/notes/{id}/revisions'>['items'][number];

/** A Notes add-on path, for the record type at hand (same shape on every type). */
function path<P extends `/v1/notes/{id}${string}`>(
  ref: RecordRef,
  notesPath: P,
) {
  return notesPath.replace('/v1/notes', ref.base) as P;
}

export const recordKeys = {
  record: (ref: RecordRef) => ['records', ref.subject, ref.id] as const,
  comments: (ref: RecordRef) =>
    ['records', ref.subject, ref.id, 'comments'] as const,
  revisions: (ref: RecordRef) =>
    ['records', ref.subject, ref.id, 'revisions'] as const,
  tags: (subject: string) => ['tags', subject] as const,
  favorites: ['favorites'] as const,
};

// Comments

/** A record's comments, oldest first (a conversation reads down), replies included. */
export function useComments(ref: RecordRef) {
  return useInfiniteQuery({
    queryKey: recordKeys.comments(ref),
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET(path(ref, '/v1/notes/{id}/comments'), {
          params: {
            path: { id: ref.id },
            query: {
              limit: 50,
              sort: 'createdAt',
              ...(pageParam && { cursor: pageParam }),
            },
          },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

function useCommentMutation<T>(
  ref: RecordRef,
  mutationFn: (input: T) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recordKeys.comments(ref) }),
  });
}

export function useAddComment(ref: RecordRef) {
  return useCommentMutation(ref, (input: { body: string; parentId?: string }) =>
    unwrap(
      api.POST(path(ref, '/v1/notes/{id}/comments'), {
        params: { path: { id: ref.id } },
        body: input,
      }),
    ),
  );
}

export function useEditComment(ref: RecordRef) {
  return useCommentMutation(ref, (input: { commentId: string; body: string }) =>
    unwrap(
      api.PATCH(path(ref, '/v1/notes/{id}/comments/{commentId}'), {
        params: { path: { id: ref.id, commentId: input.commentId } },
        body: { body: input.body },
      }),
    ),
  );
}

export function useDeleteComment(ref: RecordRef) {
  return useCommentMutation(ref, (commentId: string) =>
    unwrap(
      api.DELETE(path(ref, '/v1/notes/{id}/comments/{commentId}'), {
        params: { path: { id: ref.id, commentId } },
      }),
    ),
  );
}

/** Resolve a thread, or reopen it. */
export function useResolveComment(ref: RecordRef) {
  return useCommentMutation(
    ref,
    ({ commentId, resolved }: { commentId: string; resolved: boolean }) =>
      unwrap(
        resolved
          ? api.POST(path(ref, '/v1/notes/{id}/comments/{commentId}/resolve'), {
              params: { path: { id: ref.id, commentId } },
            })
          : api.POST(path(ref, '/v1/notes/{id}/comments/{commentId}/reopen'), {
              params: { path: { id: ref.id, commentId } },
            }),
      ),
  );
}

// Tags

/** The tags a record type can carry (the tenant's, for that subject). */
export function useTags(subject: string) {
  return useQuery({
    queryKey: recordKeys.tags(subject),
    queryFn: () =>
      unwrap(
        api.GET('/v1/tags', { params: { query: { subject, limit: 100 } } }),
      ),
  });
}

/** Replaces the record's tags; the record's own query reloads with them. */
export function useSetTags(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagIds: string[]) =>
      unwrap(
        api.PUT(path(ref, '/v1/notes/{id}/tags'), {
          params: { path: { id: ref.id } },
          body: { tagIds },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// Watching and favorites

/** Watch a record (its comments and files notify you), or stop. */
export function useWatch(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (watch: boolean) =>
      unwrap(
        watch
          ? api.POST(path(ref, '/v1/notes/{id}/watch'), {
              params: { path: { id: ref.id } },
            })
          : api.DELETE(path(ref, '/v1/notes/{id}/watch'), {
              params: { path: { id: ref.id } },
            }),
      ),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: recordKeys.favorites,
    queryFn: () => unwrap(api.GET('/v1/favorites')),
  });
}

/** Star a record (`label` is what the favorites list shows), or remove its star. */
export function useToggleFavorite(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { favoriteId?: string; label: string }) =>
      input.favoriteId
        ? unwrap(
            api.DELETE('/v1/favorites/{id}', {
              params: { path: { id: input.favoriteId } },
            }),
          )
        : unwrap(
            api.POST('/v1/favorites', {
              body: {
                kind: 'record',
                subject: ref.subject,
                target: ref.id,
                label: input.label,
              },
            }),
          ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recordKeys.favorites }),
  });
}

// Revisions

/** What changed, newest first. */
export function useRevisions(ref: RecordRef) {
  return useQuery({
    queryKey: recordKeys.revisions(ref),
    queryFn: () =>
      unwrap(
        api.GET(path(ref, '/v1/notes/{id}/revisions'), {
          params: {
            path: { id: ref.id },
            query: { limit: 50, sort: '-number' },
          },
        }),
      ),
  });
}

/** Puts a revision's values back, as the current version (`If-Match`: 412 when it changed). */
export function useRestoreRevision(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ number, etag }: { number: number; etag?: string }) =>
      unwrap(
        api.POST(path(ref, '/v1/notes/{id}/revisions/{number}/restore'), {
          params: {
            path: { id: ref.id, number },
            header: { 'If-Match': etag },
          },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
