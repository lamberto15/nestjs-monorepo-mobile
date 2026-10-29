/**
 * A list as a file (backend `data-transfer`): `POST /v1/data/exports` with
 * the list's current filters, made by a worker; the transfer says when the
 * file is ready (`data.export-ready` too) and gives its link.
 */
import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { stableQuery, type ListQuery } from '@/features/records/list';

/** The export of a record type, if the API offers one (`GET /v1/data`). */
export function useExportFor(subject: string) {
  return useQuery({
    queryKey: ['data', 'exports'],
    queryFn: () => unwrap(api.GET('/v1/data')),
    staleTime: 10 * 60_000,
    select: (data) => data.exports.find((item) => item.subject === subject),
  });
}

export function useStartExport() {
  return useMutation({
    mutationFn: ({ name, query }: { name: string; query: ListQuery }) => {
      const { sort, ...filters } = stableQuery(query);
      return unwrap(
        api.POST('/v1/data/exports', {
          body: { name, format: 'csv', filters, ...(sort && { sort }) },
        }),
      );
    },
  });
}

/** A transfer, followed until it ends. */
export function useTransfer(id: string | null) {
  return useQuery({
    queryKey: ['transfers', id],
    queryFn: () =>
      unwrap(
        api.GET('/v1/data/transfers/{id}', { params: { path: { id: id! } } }),
      ),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'queued' ||
      query.state.data?.status === 'running'
        ? 2000
        : false,
  });
}
