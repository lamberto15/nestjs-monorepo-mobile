#!/usr/bin/env node
// Every language in src/i18n/locales has exactly the keys of en.json, with
// the same {{placeholders}} in each text (as the backend's i18n:check).
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/i18n/locales';

function flatten(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)]],
  );
}

const placeholders = (text) =>
  [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort();

const load = async (file) =>
  new Map(flatten(JSON.parse(await readFile(join(DIR, file), 'utf8'))));

const reference = await load('en.json');
const problems = [];
for (const file of (await readdir(DIR)).filter((name) => name !== 'en.json')) {
  const texts = await load(file);
  for (const [key, text] of reference) {
    if (!texts.has(key)) {
      problems.push(`${file}: missing ${key}`);
    } else if (
      placeholders(texts.get(key)).join() !== placeholders(text).join()
    ) {
      problems.push(`${file}: ${key} placeholders differ from en.json`);
    }
  }
  for (const key of texts.keys()) {
    if (!reference.has(key)) {
      problems.push(`${file}: ${key} is not in en.json`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${DIR}: every language matches en.json`);
