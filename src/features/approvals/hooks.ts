/**
 * Approvals (backend `approvals`): requests waiting on a decision, staged
 * and audited; decisions send the approval's ETag as `If-Match` (412 when
 * someone decided meanwhile). Acknowledgments: documents you were asked to
 * confirm you read.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/api/api';
import { etagOf, unwrap, type GetResponse } from '@/api/client';

export type Approval = GetResponse<'/v1/approvals/{id}'>;
export type ApprovalItem = GetResponse<'/v1/approvals'>['items'][number];
export type Acknowledgment =
  GetResponse<'/v1/acknowledgments'>['items'][number];

/** Which requests a list shows. */
export type ApprovalScope = 'toDecide' | 'mine' | 'decided';

const SCOPES: Record<ApprovalScope, Record<string, string>> = {
  toDecide: { assignedToMe: 'true', status: 'pending' },
  mine: { requestedByMe: 'true' },
  decided: { decidedByMe: 'true' },
};

export const approvalKeys = {
  all: ['approvals'] as const,
  list: (scope: ApprovalScope) => ['approvals', 'list', scope] as const,
  detail: (id: string) => ['approvals', 'detail', id] as const,
  acknowledgments: (status: string) => ['acknowledgments', status] as const,
};

export function useApprovals(scope: ApprovalScope) {
  return useInfiniteQuery({
    queryKey: approvalKeys.list(scope),
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/v1/approvals', {
          params: {
            query: {
              ...SCOPES[scope],
              limit: 20,
              ...(pageParam && { cursor: pageParam }),
            } as never,
          },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** One request with its stages, assignments and timeline, and its ETag. */
export function useApproval(id: string) {
  return useQuery({
    queryKey: approvalKeys.detail(id),
    queryFn: async () => {
      const result = await api.GET('/v1/approvals/{id}', {
        params: { path: { id } },
      });
      return {
        approval: await unwrap(Promise.resolve(result)),
        etag: etagOf(result),
      };
    },
  });
}

export type Decision =
  'approve' | 'reject' | 'request-changes' | 'cancel' | 'resubmit';

/** Decisions whose comment the API requires (it says why). */
export const COMMENT_REQUIRED: readonly Decision[] = [
  'reject',
  'request-changes',
];

export function useDecide(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      decision,
      comment,
      etag,
    }: {
      decision: Decision;
      comment?: string;
      etag?: string;
    }) => {
      const params = { path: { id }, header: { 'If-Match': etag } };
      const text = comment?.trim() || undefined;
      switch (decision) {
        case 'approve':
          return unwrap(
            api.POST('/v1/approvals/{id}/approve', {
              params,
              body: { comment: text },
            }),
          );
        case 'reject':
          return unwrap(
            api.POST('/v1/approvals/{id}/reject', {
              params,
              body: { comment: text ?? '' },
            }),
          );
        case 'request-changes':
          return unwrap(
            api.POST('/v1/approvals/{id}/request-changes', {
              params,
              body: { comment: text ?? '' },
            }),
          );
        case 'cancel':
          return unwrap(
            api.POST('/v1/approvals/{id}/cancel', {
              params,
              body: { reason: text },
            }),
          );
        case 'resubmit':
          return unwrap(
            api.POST('/v1/approvals/{id}/resubmit', {
              params,
              body: { comment: text },
            }),
          );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

/** The decisions `can` allows now, in the order a person thinks of them. */
export function allowedDecisions(can: Approval['can']): Decision[] {
  return [
    ...(can.decide ? (['approve', 'request-changes', 'reject'] as const) : []),
    ...(can.resubmit ? (['resubmit'] as const) : []),
    ...(can.cancel ? (['cancel'] as const) : []),
  ];
}

export function useAcknowledgments(status: 'pending' | 'acknowledged') {
  return useQuery({
    queryKey: approvalKeys.acknowledgments(status),
    queryFn: () =>
      unwrap(api.GET('/v1/acknowledgments', { params: { query: { status } } })),
  });
}

export function useAcknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      unwrap(
        api.POST('/v1/attachments/{id}/acknowledge', {
          params: { path: { id: attachmentId } },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acknowledgments'] });
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}
