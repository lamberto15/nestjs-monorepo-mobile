import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';

export type NotificationType =
  GetResponse<'/v1/notifications/types'>['items'][number];
export type Preferences = GetResponse<'/v1/notifications/preferences'>['types'];
export type Channels = Preferences[string];
export type EmailChoice = NonNullable<Channels['email']>;

const keys = {
  types: ['notifications', 'types'] as const,
  preferences: ['notifications', 'preferences'] as const,
  quietHours: ['notifications', 'quiet-hours'] as const,
};

/** What can be notified, each type's default channels, and which are mandatory. */
export function useNotificationTypes() {
  return useQuery({
    queryKey: keys.types,
    queryFn: () => unwrap(api.GET('/v1/notifications/types')),
  });
}

/** The person's changes to the defaults, per type. */
export function usePreferences() {
  return useQuery({
    queryKey: keys.preferences,
    queryFn: () => unwrap(api.GET('/v1/notifications/preferences')),
  });
}

/** A channel's value for a type: the person's choice, else the type's default. */
export function channelValue<C extends keyof Channels>(
  preferences: Preferences,
  type: NotificationType,
  channel: C,
): Channels[C] {
  return preferences[type.type]?.[channel] ?? type.channels[channel];
}

/**
 * The preferences with one channel of one type changed. `PUT` replaces the
 * whole set (what is left out goes back to its default), so the change is
 * applied to everything the person has set.
 */
export function withChannel<C extends keyof Channels>(
  preferences: Preferences,
  type: string,
  channel: C,
  value: Channels[C],
): Preferences {
  return {
    ...preferences,
    [type]: { ...preferences[type], [channel]: value },
  };
}

/**
 * What `PUT` accepts: `GET` reports a mandatory type's channels as `false`
 * where the person has none (no device for push), but `PUT` refuses any
 * `false` on a mandatory type ("cannot be switched off"). Those are left
 * out, so the API keeps its defaults for them.
 */
export function saveBody(
  preferences: Preferences,
  types: readonly NotificationType[],
): Preferences {
  const mandatory = new Set(
    types.filter((type) => type.mandatory).map((type) => type.type),
  );
  return Object.fromEntries(
    Object.entries(preferences).map(([type, channels]) => [
      type,
      mandatory.has(type)
        ? Object.fromEntries(
            Object.entries(channels).filter(([, value]) => value !== false),
          )
        : channels,
    ]),
  );
}

export function useSavePreferences(types: readonly NotificationType[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: Preferences) =>
      unwrap(
        api.PUT('/v1/notifications/preferences', {
          body: saveBody(preferences, types),
        }),
      ),
    onSuccess: (saved) => queryClient.setQueryData(keys.preferences, saved),
  });
}

/** When push and SMS wait (urgent types excepted): `null` when off. */
export function useQuietHours() {
  return useQuery({
    queryKey: keys.quietHours,
    queryFn: () => unwrap(api.GET('/v1/notifications/quiet-hours')),
  });
}

export function useSetQuietHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (window: { start: string; end: string } | null) =>
      unwrap(
        window
          ? api.PUT('/v1/notifications/quiet-hours', { body: window })
          : api.DELETE('/v1/notifications/quiet-hours'),
      ),
    onSuccess: (saved) => queryClient.setQueryData(keys.quietHours, saved),
  });
}

/** After the account's time zone changes, the window follows its clock. */
export function useRefreshQuietHours() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keys.quietHours });
}
