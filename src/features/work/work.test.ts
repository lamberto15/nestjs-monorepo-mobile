import { groupHits, snippetParts, type SearchHit } from '@/features/work/hooks';

test('a snippet splits into text and marked matches, never HTML', () => {
  expect(snippetParts('the <b>quarterly</b> plan <i>x</i>')).toEqual([
    { text: 'the ', match: false },
    { text: 'quarterly', match: true },
    { text: ' plan <i>x</i>', match: false },
  ]);
  expect(snippetParts(null)).toEqual([]);
});

const hit = (subject: string, id: string, plural: string): SearchHit => ({
  subject,
  id,
  title: id,
  snippet: '',
  score: 1,
  link: `/x/${id}`,
  subjectLabel: { singular: subject, plural },
});

test('hits group by kind, kinds in the order they first appear', () => {
  const groups = groupHits([
    hit('Note', 'n1', 'Notes'),
    hit('Invoice', 'i1', 'Invoices'),
    hit('Note', 'n2', 'Notes'),
  ]);
  expect(
    groups.map((group) => [group.label, group.hits.map((h) => h.id)]),
  ).toEqual([
    ['Notes', ['n1', 'n2']],
    ['Invoices', ['i1']],
  ]);
});
