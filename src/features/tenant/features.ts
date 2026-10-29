/**
 * What this deployment and tenant have switched on (`GET /v1/features`):
 * PDFs (`documents`), presigned uploads, the sign-in options, the
 * deployment's mode (read-only or maintenance). Entry points of what is
 * off stay hidden; tenant switches reset it with every query.
 */
import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';

export type Features = GetResponse<'/v1/features'>;

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => unwrap(api.GET('/v1/features')),
    staleTime: 5 * 60_000,
  });
}
