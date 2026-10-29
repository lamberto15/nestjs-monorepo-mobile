import {
  insertMention,
  mentionQuery,
  withNames,
} from '@/features/records/mentions';

test('a trailing @ with two characters asks for suggestions', () => {
  expect(mentionQuery('Thanks @ma')).toBe('ma');
  expect(mentionQuery('@maya')).toBe('maya');
  expect(mentionQuery('Thanks @m')).toBeUndefined();
  expect(mentionQuery('mail me at a@b.com')).toBeUndefined();
  expect(mentionQuery('Thanks @maya ')).toBeUndefined();
});

test('choosing a person writes their key in place of what was typed', () => {
  expect(insertMention('Thanks @ma', 'user:u1')).toBe('Thanks @user:u1 ');
});

test('mentions read by name; unknown ones stay as written', () => {
  const names = { 'user:u1': 'Maya Patel', 'ada@example.com': 'Ada' };
  expect(withNames('Hi @user:u1 and @Ada@Example.com', names)).toBe(
    'Hi @Maya Patel and @Ada',
  );
  expect(withNames('Hi @user:u9', names)).toBe('Hi @user:u9');
});
