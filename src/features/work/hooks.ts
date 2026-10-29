/**
 * Work surfaces (backend `work-surfaces`): the inbox (what waits on you:
 * approvals to decide or revise, unread mentions), records you opened
 * lately, and global search.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';

export type InboxItem = GetResponse<'/v1/inbox'>['items'][number];
export type SearchHit = GetResponse<'/v1/search'>['items'][number];

const keys = {
  inbox: ['inbox'] as const,
  recents: ['recents'] as const,
  search: (q: string) => ['search', q] as const,
};

export function useInbox() {
  return useInfiniteQuery({
    queryKey: keys.inbox,
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/v1/inbox', {
          params: {
            query: { limit: 20, ...(pageParam && { cursor: pageParam }) },
          },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Dismiss an item that allows it (a mention is marked read). */
export function useDismiss() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      unwrap(api.POST('/v1/inbox/dismiss', { body: { key } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.inbox }),
  });
}

export function useRecents() {
  return useQuery({
    queryKey: keys.recents,
    queryFn: () => unwrap(api.GET('/v1/recents')),
  });
}

/** A record was opened: it goes first (`label` is its title, never its content). */
export function useRecordRecent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; recordId: string; label: string }) =>
      unwrap(api.POST('/v1/recents', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.recents }),
  });
}

export function useClearRecents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/v1/recents')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.recents }),
  });
}

/** Everything the person may read that matches, best first, across kinds. */
export function useSearch(q: string) {
  return useQuery({
    queryKey: keys.search(q),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/v1/search', { params: { query: { q, limit: 30 } }, signal }),
      ),
    enabled: q.length >= 2,
  });
}

/**
 * A search snippet's parts: the API marks matches with `<b>…</b>`; the rest
 * is text (never rendered as HTML).
 */
export function snippetParts(
  snippet: string | null,
): { text: string; match: boolean }[] {
  return (snippet ?? '')
    .split(/(<b>.*?<\/b>)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('<b>') && part.endsWith('</b>')
        ? { text: part.slice(3, -4), match: true }
        : { text: part.replace(/<\/?b>/g, ''), match: false },
    );
}

/** Hits grouped by their kind, in the order the kinds first appear. */
export function groupHits(
  hits: SearchHit[],
): { label: string; hits: SearchHit[] }[] {
  const groups = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const label = hit.subjectLabel?.plural ?? hit.subject;
    groups.set(label, [...(groups.get(label) ?? []), hit]);
  }
  return [...groups].map(([label, items]) => ({ label, hits: items }));
}
