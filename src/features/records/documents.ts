/**
 * PDFs of a record (backend `documents`): asked for, rendered by a worker
 * (`document.ready` when done), stored as an attachment of the record.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';
import type { Language } from '@/features/account/language';
import type { RecordRef } from '@/features/records/hooks';

export type RecordDocument =
  GetResponse<'/v1/notes/{id}/documents'>['items'][number];

const key = (ref: RecordRef) =>
  ['records', ref.subject, ref.id, 'documents'] as const;

/** The record's PDFs, newest first; looked at again while one is being made. */
export function useDocuments(ref: RecordRef) {
  return useQuery({
    queryKey: key(ref),
    queryFn: () =>
      unwrap(
        api.GET(`${ref.base}/{id}/documents` as '/v1/notes/{id}/documents', {
          params: {
            path: { id: ref.id },
            query: { limit: 10, sort: '-createdAt' },
          },
        }),
      ),
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (item) => item.status === 'queued' || item.status === 'rendering',
      )
        ? 3000
        : false,
  });
}

/** A new PDF in the person's language. */
export function useMakePdf(ref: RecordRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lang: Language) =>
      unwrap(
        api.POST(`${ref.base}/{id}/pdf` as '/v1/notes/{id}/pdf', {
          params: { path: { id: ref.id }, query: { lang } },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(ref) }),
  });
}
