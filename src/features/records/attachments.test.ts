import { formatSize, tooLarge } from '@/features/records/attachments';

test('a file over the type limit is refused before sending; an unknown size is sent', () => {
  const max = 25 * 1024 * 1024;
  expect(tooLarge({ uri: 'f', name: 'a', size: max + 1 }, max)).toBe(true);
  expect(tooLarge({ uri: 'f', name: 'a', size: max }, max)).toBe(false);
  expect(tooLarge({ uri: 'f', name: 'a', size: null }, max)).toBe(false);
  expect(tooLarge({ uri: 'f', name: 'a', size: max + 1 }, undefined)).toBe(
    false,
  );
});

test('sizes read as people say them', () => {
  expect(formatSize(512)).toBe('512 B');
  expect(formatSize(2.4 * 1024 * 1024)).toBe('2.4 MB');
  expect(formatSize(25 * 1024 * 1024)).toBe('25 MB');
});
