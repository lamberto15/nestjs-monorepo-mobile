// node --test scripts/  (pnpm test:scripts)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { names, renameKeys, renamer } from './feature-add.mjs';

test('a feature has four spellings; an irregular plural is given', () => {
  assert.deepEqual(names('Invoice'), {
    Singular: 'Invoice',
    singular: 'invoice',
    Plural: 'Invoices',
    plural: 'invoices',
    path: 'invoices',
  });
  assert.equal(names('Person', 'people').Plural, 'People');
  assert.equal(names('LineItem', 'line-items').plural, 'lineItems');
  assert.throws(() => names('invoice'));
  assert.throws(() => names('Invoice', 'Invoices'));
});

test('code renames identifiers, routes and keys, not other words', () => {
  const rename = renamer(names('Invoice'));
  const cases = [
    [
      'export function useNote(id: string)',
      'export function useInvoice(id: string)',
    ],
    ['<NoteForm initial={note} />', '<InvoiceForm initial={invoice} />'],
    ['noteRecord(id)', 'invoiceRecord(id)'],
    ["api.GET('/v1/notes/{id}')", "api.GET('/v1/invoices/{id}')"],
    [
      "router.push({ pathname: '/notes/[id]' })",
      "router.push({ pathname: '/invoices/[id]' })",
    ],
    ["t('notes.title')", "t('invoices.title')"],
    ["can['Note.create']", "can['Invoice.create']"],
    ['type NoteStatus', 'type InvoiceStatus'],
    ['a Notebook and a footnote', 'a Notebook and a footnote'],
    ['@/features/notifications/link', '@/features/notifications/link'],
  ];
  for (const [before, after] of cases) {
    assert.equal(rename(before), after);
  }
});

test('a hyphenated path stays in URLs, camelCase in code', () => {
  const rename = renamer(names('LineItem', 'line-items'));
  assert.equal(rename("api.GET('/v1/notes')"), "api.GET('/v1/line-items')");
  assert.equal(rename("t('notes.list')"), "t('lineItems.list')");
});

test('other languages get the same keys, their texts left to translate', () => {
  const rename = renamer(names('Task'));
  assert.deepEqual(
    renameKeys({ note: 'Notiz', statuses: { draft: 'Entwurf' } }, rename),
    {
      task: 'Notiz',
      statuses: { draft: 'Entwurf' },
    },
  );
});
