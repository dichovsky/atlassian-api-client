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

function changelogSections(changelog) {
  const sections = [];
  for (const line of changelog.split('\n')) {
    if (line.startsWith('## ')) sections.push({ heading: line.trimEnd(), body: [] });
    else sections.at(-1)?.body.push(line);
  }
  return sections;
}

function isCalendarDate(value) {
  const time = Date.parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

// The release section must already hold everything being shipped: an
// Unreleased section with content means the fold was skipped, and a pushed
// tag cannot be moved to fix that afterwards.
function changelogProblem(changelog, version) {
  const sections = changelogSections(changelog);
  const isUnreleased = (section) => /^## \[Unreleased\]/i.test(section.heading);
  if (sections.some((s) => isUnreleased(s) && s.body.some((line) => line.trim() !== ''))) {
    return `CHANGELOG.md has unreleased entries; move them into the ${version} section before tagging`;
  }

  const releases = sections.filter((section) => !isUnreleased(section));
  const heading = new RegExp(`^## \\[${escapeRegex(version)}\\](?:\\([^\\n]*\\))?`);
  const matches = releases.filter((section) => heading.test(section.heading));
  if (matches.length === 0) return `CHANGELOG.md has no release section for ${version}`;
  if (matches.length > 1) {
    return `CHANGELOG.md has ${matches.length} release sections for ${version}`;
  }
  if (releases[0] !== matches[0]) {
    return `CHANGELOG.md release section for ${version} must be the newest entry; found ${JSON.stringify(releases[0].heading)} above it`;
  }

  const date = / \((\d{4}-\d{2}-\d{2})\)$/.exec(matches[0].heading)?.[1];
  if (!date || !isCalendarDate(date)) {
    return `CHANGELOG.md release section for ${version} must end with its release date as (YYYY-MM-DD); received ${JSON.stringify(matches[0].heading)}`;
  }
  return undefined;
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
    const problem = changelogProblem(changelog, version);
    if (problem) {
      fail(problem);
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
