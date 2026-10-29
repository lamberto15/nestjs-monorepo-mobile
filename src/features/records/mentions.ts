/**
 * @mentions in comments (backend `comments`): the body carries
 * `@user:<id>` (or `@address`); the API names each one in `mentionNames`.
 * Typing `@ma` suggests people (`GET /v1/people?q=ma`); choosing one writes
 * their key.
 */
import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';

/** What follows a trailing `@` being typed (at least two characters), if any. */
export function mentionQuery(text: string): string | undefined {
  return /(?:^|\s)@([^\s@]{2,})$/.exec(text)?.[1];
}

/** Replaces the trailing `@partial` with the chosen person's key. */
export function insertMention(text: string, key: string): string {
  return text.replace(/@[^\s@]*$/, `@${key} `);
}

/** The body as people read it: each mention by name, as the API named it. */
export function withNames(
  body: string,
  names: Record<string, string | null> | undefined,
): string {
  return body.replace(
    /@(user:[\w-]+|[^\s@]+@[^\s@]+)/g,
    (whole, key: string) => {
      const name = names?.[key] ?? names?.[key.toLowerCase()];
      return name ? `@${name}` : whole;
    },
  );
}

/** People to mention: members of the tenant matching what's typed. */
export function usePeople(q: string | undefined) {
  return useQuery({
    queryKey: ['people', q],
    queryFn: () =>
      unwrap(api.GET('/v1/people', { params: { query: { q: q!, limit: 5 } } })),
    enabled: Boolean(q),
    staleTime: 60_000,
  });
}
