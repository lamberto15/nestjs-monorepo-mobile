/**
 * A record type's list, described by the API (`GET /v1/lists/{subject}`):
 * its filterable fields (custom ones included), search, capabilities
 * (tags, comments, attachments…); and saved views (`/v1/views`). Lists
 * build their filters from it instead of hard-coding fields.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';

export type ListMetadata = GetResponse<'/v1/lists/{subject}'>;
export type ListField = ListMetadata['fields'][number];
export type SavedView = GetResponse<'/v1/views'>['items'][number];
/** A list route's query: flat filters (`status`, `title.contains`), `q`, `sort`. */
export type ListQuery = Record<string, string>;

const keys = {
  list: (subject: string) => ['lists', subject] as const,
  views: (subject: string) => ['views', subject] as const,
};

export function useListMetadata(subject: string) {
  return useQuery({
    queryKey: keys.list(subject),
    queryFn: () =>
      unwrap(api.GET('/v1/lists/{subject}', { params: { path: { subject } } })),
    staleTime: 5 * 60_000,
  });
}

/**
 * The fields a phone filters by with a tap: enums and booleans that take
 * `eq` (`status`, a yes/no custom field). Text goes through search.
 */
export function chipFields(metadata: ListMetadata | undefined): ListField[] {
  return (metadata?.fields ?? []).filter(
    (field) =>
      field.operators.includes('eq') &&
      ((field.type === 'enum' && (field.options?.length ?? 0) > 0) ||
        field.type === 'boolean'),
  );
}

/** A field's name for people: a custom field's label, else its name. */
export const fieldLabel = (field: Pick<ListField, 'name' | 'label'>) =>
  field.label ?? field.name.replace(/^custom\./, '');

/** The query without paging, sorted, so equal filters share a cache entry. */
export function stableQuery(query: ListQuery): ListQuery {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== '')
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function useViews(subject: string) {
  return useQuery({
    queryKey: keys.views(subject),
    queryFn: () =>
      unwrap(
        api.GET('/v1/views', { params: { query: { subject, limit: 50 } } }),
      ),
  });
}

/** A view as the list route takes it now (checked again against permissions). */
export function useApplyView() {
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.GET('/v1/views/{id}/apply', { params: { path: { id } } })),
  });
}

/** Saves the current filters, sort and search as a private view. */
export function useSaveView(subject: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, query }: { name: string; query: ListQuery }) =>
      unwrap(api.POST('/v1/views', { body: { subject, name, query } })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.views(subject) }),
  });
}

export function useDeleteView(subject: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/v1/views/{id}', { params: { path: { id } } })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.views(subject) }),
  });
}
