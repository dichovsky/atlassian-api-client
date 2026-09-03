#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const USAGE = 'Usage: node scripts/validate-release-tag.js vX.Y.Z';
const STABLE_TAG = /^v((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/;

function fail(message) {
  process.stderr.write(`Release validation failed: ${message}\n`);
  process.exitCode = 1;
}

function readJson(file) {
  const path = resolve(process.cwd(), file);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot read ${file}: ${detail}`);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    fail(USAGE);
    return;
  }

  const tag = args[0];
  const match = STABLE_TAG.exec(tag);
  if (!match) {
    fail(`expected a stable release tag in the form vX.Y.Z; received ${JSON.stringify(tag)}`);
    return;
  }

  const version = match[1];

  try {
    const packageJson = readJson('package.json');
    const packageLock = readJson('package-lock.json');
    const versions = [
      ['package.json', packageJson.version],
      ['package-lock.json top-level', packageLock.version],
      ['package-lock.json root package', packageLock.packages?.['']?.version],
    ];

    for (const [source, actual] of versions) {
      if (actual !== version) {
        fail(
          `${source} version must equal tag version ${version}; received ${JSON.stringify(actual)}`,
        );
        return;
      }
    }

    const changelog = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
    const section = new RegExp(`^## \\[${escapeRegex(version)}\\](?:\\([^\\n]*\\))?`, 'm');
    if (!section.test(changelog)) {
      fail(`CHANGELOG.md has no release section for ${version}`);
      return;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(detail);
    return;
  }

  process.stdout.write(`Release tag ${tag} is valid for package version ${version}.\n`);
}

main();
