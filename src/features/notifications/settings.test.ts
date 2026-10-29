import {
  channelValue,
  withChannel,
  type NotificationType,
} from '@/features/notifications/settings';

const type = (name: string): NotificationType => ({
  type: name,
  label: name,
  mandatory: false,
  urgent: false,
  channels: { email: 'immediate' },
});

test("a channel is the person's choice, else the type's default", () => {
  const preferences = { 'note.published': { email: 'daily' as const } };

  expect(channelValue(preferences, type('note.published'), 'email')).toBe(
    'daily',
  );
  expect(channelValue(preferences, type('note.deleted'), 'email')).toBe(
    'immediate',
  );
});

test('changing one channel keeps every other choice (PUT replaces the set)', () => {
  const preferences = {
    'note.published': { email: 'daily' as const, push: true },
    'note.deleted': { email: false as const },
  };

  expect(withChannel(preferences, 'note.published', 'email', 'hourly')).toEqual(
    {
      'note.published': { email: 'hourly', push: true },
      'note.deleted': { email: false },
    },
  );
});
