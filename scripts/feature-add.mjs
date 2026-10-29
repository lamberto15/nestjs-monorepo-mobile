#!/usr/bin/env node
// Scaffolds a feature from the Notes example (docs/adding-a-feature.md):
//
//   pnpm feature:add Invoice            # routes /v1/invoices, screens /invoices
//   pnpm feature:add Person people      # an irregular plural
//
// Copies src/features/notes and src/app/(app)/notes under the new names,
// renames Note/Notes/note/notes in the code, copies the texts in every
// language (English renamed; the others to translate), and registers the
// tab and the record route. The backend feature comes first: sync the
// client (`pnpm client:sync main`), then adjust the fields to yours.
import {
  cp,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

/** The four spellings of a feature: `Invoice`, `invoice`, `Invoices`, `invoices`. */
export function names(subject, path) {
  if (!/^[A-Z][A-Za-z]*$/.test(subject)) {
    throw new Error(
      `The subject is a PascalCase name, like Invoice: "${subject}".`,
    );
  }
  const plural = path ?? `${subject.toLowerCase()}s`;
  if (!/^[a-z][a-z-]*$/.test(plural)) {
    throw new Error(`The path is lowercase, like invoices: "${plural}".`);
  }
  const camel = plural.replace(/-([a-z])/g, (_, letter) =>
    letter.toUpperCase(),
  );
  return {
    Singular: subject,
    singular: subject.charAt(0).toLowerCase() + subject.slice(1),
    Plural: camel.charAt(0).toUpperCase() + camel.slice(1),
    plural: camel,
    path: plural,
  };
}

/**
 * Renames the example's words in code: `Note`/`Notes` also inside
 * identifiers (`useNote`, `NoteForm`), `note`/`notes` only where a word
 * starts (`noteRecord`, `/v1/notes`, `notes.title`), never inside another
 * word (`Notebook`, `footnote`).
 */
export function renamer(feature) {
  const words = {
    Notes: feature.Plural,
    Note: feature.Singular,
    notes: feature.plural,
    note: feature.singular,
  };
  return (text) =>
    text
      .replace(/\/v1\/notes\b/g, `/v1/${feature.path}`)
      .replace(/(['"`/])\/?notes(?=[/'"`[])/g, (whole, quote) =>
        whole.replace('notes', feature.path),
      )
      .replace(/(Notes|Note)(?![a-z])/g, (word) => words[word])
      .replace(/(?<![A-Za-z])(notes|note)(?![a-z])/g, (word) => words[word]);
}

/** The same keys in every language: English renames its texts too, the others only their keys. */
export function renameKeys(value, rename_) {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      rename_(key),
      renameKeys(inner, rename_),
    ]),
  );
}

async function exists(path) {
  return stat(path).then(
    () => true,
    () => false,
  );
}

async function renameTree(dir, rename_) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await renameTree(path, rename_);
      continue;
    }
    await writeFile(path, rename_(await readFile(path, 'utf8')));
    const renamed = entry.name.replace(/^note-/, `${rename_('note')}-`);
    if (renamed !== entry.name) {
      await rename(path, join(dir, renamed));
    }
  }
}

/** Inserts `text` after the line holding `anchor`; fails loudly if it's gone. */
async function insertAfter(file, anchor, text) {
  const source = await readFile(file, 'utf8');
  const at = source.indexOf(anchor);
  if (at === -1) {
    throw new Error(
      `${file}: "${anchor}" not found; add the lines yourself:\n${text}`,
    );
  }
  const end = source.indexOf('\n', at) + 1;
  await writeFile(file, source.slice(0, end) + text + source.slice(end));
}

async function main([subject, path]) {
  const feature = names(subject, path);
  const rename_ = renamer(feature);
  const features = join('src/features', feature.path);
  const screens = join('src/app/(app)', feature.path);
  for (const target of [features, screens]) {
    if (await exists(target)) {
      throw new Error(`${target} exists already.`);
    }
  }

  await cp('src/features/notes', features, { recursive: true });
  await cp('src/app/(app)/notes', screens, { recursive: true });
  await renameTree(features, rename_);
  await renameTree(screens, rename_);

  // Texts: the notes block under the feature's name; English renamed, the
  // other languages copied for a translator (i18n:check keeps them complete).
  for (const file of await readdir('src/i18n/locales')) {
    const locale = join('src/i18n/locales', file);
    const texts = JSON.parse(await readFile(locale, 'utf8'));
    texts[feature.plural] =
      file === 'en.json'
        ? JSON.parse(rename_(JSON.stringify(texts.notes)))
        : renameKeys(texts.notes, rename_);
    texts.tabs[feature.plural] =
      file === 'en.json' ? feature.Plural : texts.tabs.notes;
    await writeFile(locale, `${JSON.stringify(texts, null, 2)}\n`);
  }

  await insertAfter(
    'src/features/notifications/link.ts',
    'Note: (id) => `/notes/${id}`,',
    `  ${feature.Singular}: (id) => \`/${feature.path}/\${id}\`,\n`,
  );
  await insertAfter(
    'src/app/(app)/_layout.tsx',
    '<NativeTabs.Trigger.Icon sf="note.text" md="description" />',
    `      </NativeTabs.Trigger>\n      <NativeTabs.Trigger name="${feature.path}">\n        <NativeTabs.Trigger.Label>{t('tabs.${feature.plural}')}</NativeTabs.Trigger.Label>\n        <NativeTabs.Trigger.Icon sf="doc.text" md="article" />\n`,
  );

  console.log(`Added ${feature.Plural}: ${features}, ${screens}, a tab, texts and the record route.

Next:
  1. The backend feature exists and the client is synced: pnpm client:sync main
  2. pnpm typecheck: it names the fields that differ from Notes (title, body, status); change them to yours
  3. Translate the "${feature.plural}" texts in the non-English locales
  4. Add /${feature.path}/{id} to APP_ROUTES in src/features/notifications/link.ts if notifications link to it
  5. pnpm format && pnpm lint && pnpm test`);
}

if (process.argv[1]?.endsWith('feature-add.mjs')) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
