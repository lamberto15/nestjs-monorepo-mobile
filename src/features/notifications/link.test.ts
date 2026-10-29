import { linkUrl } from '@/features/notifications/link';

test('a web app path opens on the web app; an absolute URL as it is', () => {
  expect(linkUrl('/notes/1', 'https://app.test/')).toBe(
    'https://app.test/notes/1',
  );
  expect(linkUrl('https://elsewhere.test/x', undefined)).toBe(
    'https://elsewhere.test/x',
  );
});

test('nothing opens without a web app, or for other schemes', () => {
  expect(linkUrl('/notes/1', undefined)).toBeUndefined();
  expect(linkUrl('//evil.test/x', 'https://app.test')).toBeUndefined();
  expect(linkUrl('javascript:alert(1)', 'https://app.test')).toBeUndefined();
  expect(linkUrl(null, 'https://app.test')).toBeUndefined();
});
