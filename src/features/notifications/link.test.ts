import { appRoute, linkUrl, recordRoute } from '@/features/notifications/link';

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

test('a link to a screen of this app opens it in the app', () => {
  expect(appRoute('/notes/0194-abc')).toBe('/notes/0194-abc');
  expect(appRoute('/notes/0194-abc?tab=comments')).toBe('/notes/0194-abc');
  expect(appRoute('/notes')).toBeUndefined();
  expect(appRoute('/reports/1')).toBeUndefined();
  expect(appRoute('https://app.test/notes/1')).toBeUndefined();
});

test('a record opens its screen when the app has one', () => {
  expect(recordRoute('Note', 'n1')).toBe('/notes/n1');
  expect(recordRoute('Invoice', 'i1')).toBeUndefined();
  expect(recordRoute('Note', null)).toBeUndefined();
});
