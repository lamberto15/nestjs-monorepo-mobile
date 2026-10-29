import { shouldRelock } from '@/features/account/app-lock';
import { linkPath, pendingLink } from '@/features/auth/pending-link';

test('a link gives its app path, whatever its form', () => {
  expect(linkPath('nestjsmonorepomobile://notes/n1')).toBe('/notes/n1');
  expect(linkPath('https://app.example.com/notes/n1?tab=files')).toBe(
    '/notes/n1?tab=files',
  );
  expect(linkPath('exp://192.168.1.2:8081/--/approvals/a1')).toBe(
    '/approvals/a1',
  );
  expect(linkPath('nestjsmonorepomobile://')).toBeUndefined();
  expect(linkPath('https://app.example.com/sign-in')).toBeUndefined();
  expect(linkPath('not a url')).toBeUndefined();
});

test('a link kept while signed out opens once, after sign-in', () => {
  pendingLink.keep('nestjsmonorepomobile://notes/n1');
  pendingLink.keep(null); // the app re-rendering: the link stays
  expect(pendingLink.take()).toBe('/notes/n1');
  expect(pendingLink.take()).toBeUndefined();
});

test('back from the background after the grace time, the app locks', () => {
  expect(shouldRelock(1_000, 1_000 + 59_999)).toBe(false);
  expect(shouldRelock(1_000, 1_000 + 60_000)).toBe(true);
  expect(shouldRelock(null, 1_000_000)).toBe(false);
});
