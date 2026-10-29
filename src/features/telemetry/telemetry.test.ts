import { scrub, screenPath, telemetry } from '@/features/telemetry/telemetry';

afterEach(() => {
  telemetry.use(null);
  telemetry.setConsent(false);
});

test('nothing is sent without a sink and a consent', () => {
  const sink = { track: jest.fn() };
  telemetry.track('opened');
  telemetry.use(sink);
  telemetry.track('opened');
  expect(sink.track).not.toHaveBeenCalled();

  telemetry.setConsent(true);
  telemetry.track('opened', { tab: 'notes' });
  expect(sink.track).toHaveBeenCalledWith('opened', { tab: 'notes' });
});

test('personal data never leaves: keys dropped, emails and tokens cut', () => {
  expect(
    scrub({
      tab: 'notes',
      email: 'ada@example.com',
      accessToken: 'x',
      userName: 'Ada',
      note: 'mail ada@example.com',
      header: 'eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl',
      count: 3,
    }),
  ).toEqual({ tab: 'notes', note: '[removed]', header: '[removed]', count: 3 });
});

test('screen views carry routes, not record ids', () => {
  expect(screenPath('/notes/0194f3a2-7b1c-7c3e-9a10-1234567890ab')).toBe(
    '/notes/:id',
  );
  expect(screenPath('/approvals/42?tab=history')).toBe('/approvals/:id');
  expect(screenPath('/account/security')).toBe('/account/security');
});
