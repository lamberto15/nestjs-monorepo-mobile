/**
 * Generated from openapi.json by `pnpm client:generate`: do not edit.
 * `pnpm client:check` fails when it is stale.
 */

import type { components } from './schema.js';

/** Every event the API pushes on `/realtime`, with its payload (the OpenAPI document's `x-realtime-events`). */
export interface RealtimeEventPayloads {
  /** A new notification, in the recipient's language. */
  'notification': components['schemas']['RealtimeNotificationEvent'];
  /** A notification was marked read (or unread: `readAt` null). */
  'notification.read': components['schemas']['RealtimeNotificationReadEvent'];
  /** `before`: what the call passed (null: all of them); `updated`: how many changed. */
  'notifications.read-all': components['schemas']['RealtimeNotificationsReadAllEvent'];
  /** A notification was removed. */
  'notification.removed': components['schemas']['RealtimeNotificationRemovedEvent'];
  /** After each of the above, and at most once a second after deliveries: the badge's number. */
  'notifications.unread-count': components['schemas']['RealtimeNotificationsUnreadCountEvent'];
  /** An export is ready: `url` is a signed link to the file. */
  'data.export-ready': components['schemas']['RealtimeDataExportReadyEvent'];
  /** An import ended: how many rows were imported and how many refused. */
  'data.import-finished': components['schemas']['RealtimeDataImportFinishedEvent'];
  /** An export or import is running: `processed` rows so far (an import also `imported` and `failed`). Throttled (an export: at most once a second; an import: every 500 rows); `GET /v1/data/transfers/{id}` has the same numbers. */
  'data.progress': components['schemas']['RealtimeDataProgressEvent'];
  /** An export or import failed for good (not a few refused rows: that is `data.import-finished`); `error` says why, for people. The transfer reads `failed` at `GET /v1/data/transfers/{id}` by now. */
  'data.failed': components['schemas']['RealtimeDataFailedEvent'];
  /** An approval request waits for you (or for someone you stand in for): `GET /v1/approvals/{id}`. */
  'approval.assigned': components['schemas']['RealtimeApprovalAssignedEvent'];
  /** A decision on a request you made or decide, or its end: `status` is the request's after it (pending while stages remain); `decision` null when no person decided (cancelled, expired, failed). */
  'approval.decided': components['schemas']['RealtimeApprovalDecidedEvent'];
  /** An approved request's outcome was applied (the note is published, say): `outcomeAppliedAt` is now set on `GET /v1/approvals/{id}`. To the requester and the approvers of the round, once; a banner showing "approved, applying" can clear without polling. */
  'approval.applied': components['schemas']['RealtimeApprovalAppliedEvent'];
  /** A queued bulk operation ended; its item results: `GET /v1/bulk/{id}`. */
  'bulk.finished': components['schemas']['RealtimeBulkFinishedEvent'];
  /** A queued bulk run is running: items processed so far, every few hundred items. */
  'bulk.progress': components['schemas']['RealtimeBulkProgressEvent'];
  /** A queued bulk run failed for good (its worker was lost, say); items done stay done (`GET /v1/bulk/{id}`, the audit log). `error` says why, for people. */
  'bulk.failed': components['schemas']['RealtimeBulkFailedEvent'];
  /** A document you asked for (`POST /v1/notes/{id}/pdf`) was issued: the PDF is the record's attachment `attachmentId`. */
  'document.ready': components['schemas']['RealtimeDocumentReadyEvent'];
  /** A document you asked for failed for good; `error` says why, for people. */
  'document.failed': components['schemas']['RealtimeDocumentFailedEvent'];
  /** An AI run you asked for (`POST /v1/ai/runs`) finished: read the answer at `GET /v1/ai/runs/{id}`. */
  'ai.ready': components['schemas']['RealtimeAiReadyEvent'];
  /** An AI run you asked for failed for good; `error` says why, for people. */
  'ai.failed': components['schemas']['RealtimeAiFailedEvent'];
  /** A comment on a record you watch (or one you wrote, for your other tabs) was added, edited or removed: ids only, fetch the thread. */
  'record.commented': components['schemas']['RealtimeRecordCommentedEvent'];
  /** Someone started or stopped viewing or editing a record you are viewing (or one you are editing, for your other tabs): ids only, fetch `GET /v1/presence/{subject}/{recordId}`. Sent only to people who are present and may read the record; advisory, never a lock. */
  'record.presence': components['schemas']['RealtimeRecordPresenceEvent'];
  /** A file on a record you watch was uploaded, removed, issued (a PDF), scanned clean (it can be downloaded now; MALWARE_SCANNER) or processed (an image's thumbnail and preview are made, or it could not be; IMAGE_PROCESSING): ids only. */
  'record.attachments.changed': components['schemas']['RealtimeRecordAttachmentsChangedEvent'];
}
