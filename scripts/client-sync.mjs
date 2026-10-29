#!/usr/bin/env node
// Copies the backend's typed client (packages/api-client/src) into
// src/api/client at the commit pinned in client-sync.json.
//
//   pnpm client:sync          the pinned commit
//   pnpm client:sync <ref>    pin another commit (a branch or tag is resolved to its sha)
//   pnpm client:sync --check  fail when src/api/client differs from the pinned commit (CI)
//
// Public repositories only need Node's fetch; a private one reads
// GITHUB_TOKEN. The files are copied as they are: the client is the
// backend's, changed there and synced here.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CONFIG = 'client-sync.json';
const TARGET = 'src/api/client';
const SOURCE_DIR = 'packages/api-client/src';

const args = process.argv.slice(2);
const check = args.includes('--check');
const ref = args.find((arg) => !arg.startsWith('--'));

const config = JSON.parse(await readFile(CONFIG, 'utf8'));
const headers = {
  Accept: 'application/vnd.github+json',
  ...(process.env.GITHUB_TOKEN && {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }),
};

async function github(path, accept) {
  const response = await fetch(
    `https://api.github.com/repos/${config.repo}/${path}`,
    {
      headers: accept ? { ...headers, Accept: accept } : headers,
    },
  );
  if (!response.ok) {
    throw new Error(
      `GitHub ${path}: ${response.status} ${await response.text()}`,
    );
  }
  return response;
}

if (ref) {
  const commit = await (
    await github(`commits/${encodeURIComponent(ref)}`)
  ).json();
  config.commit = commit.sha;
}

const listing = await (
  await github(`contents/${SOURCE_DIR}?ref=${config.commit}`)
).json();
const names = listing
  .filter((entry) => entry.type === 'file' && entry.name.endsWith('.ts'))
  .filter((entry) => !entry.name.endsWith('.spec.ts'))
  .map((entry) => entry.name)
  .sort();

const files = new Map();
for (const name of names) {
  const response = await github(
    `contents/${SOURCE_DIR}/${name}?ref=${config.commit}`,
    'application/vnd.github.raw',
  );
  files.set(name, await response.text());
}

if (check) {
  const local = (await readdir(TARGET))
    .filter((name) => name.endsWith('.ts'))
    .sort();
  const stale = [...new Set([...local, ...names])].filter(
    (name) => !files.has(name) || !local.includes(name),
  );
  for (const [name, text] of files) {
    if (
      local.includes(name) &&
      (await readFile(join(TARGET, name), 'utf8')) !== text
    ) {
      stale.push(name);
    }
  }
  if (stale.length) {
    console.error(
      `${TARGET} differs from ${config.repo}@${config.commit}: ${stale.join(', ')}. Run pnpm client:sync.`,
    );
    process.exit(1);
  }
  console.log(`${TARGET} matches ${config.repo}@${config.commit}`);
  process.exit(0);
}

await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
for (const [name, text] of files) {
  await writeFile(join(TARGET, name), text);
}
await writeFile(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
console.log(
  `Copied ${files.size} files from ${config.repo}@${config.commit} to ${TARGET}`,
);
