#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = 'Usage: node scripts/validate-release-tag.js vX.Y.Z';
const STABLE_TAG = /^v((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/;

function readJson(readFile, file) {
  try {
    return JSON.parse(readFile(file));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot read ${file}: ${detail}`, { cause: error });
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

/**
 * Check a release tag against package.json, package-lock.json and CHANGELOG.md.
 *
 * @param {readonly string[]} args - The command-line arguments: exactly one tag.
 * @param {(file: string) => string} readFile - Reads a repository file as UTF-8.
 * @returns {string | undefined} Why the tag is invalid, or `undefined` when it is valid.
 */
export function releaseTagProblem(args, readFile) {
  if (args.length !== 1) return USAGE;

  const tag = args[0];
  const match = STABLE_TAG.exec(tag);
  if (!match) {
    return `expected a stable release tag in the form vX.Y.Z; received ${JSON.stringify(tag)}`;
  }

  const version = match[1];

  try {
    const packageJson = readJson(readFile, 'package.json');
    const packageLock = readJson(readFile, 'package-lock.json');
    const versions = [
      ['package.json', packageJson.version],
      ['package-lock.json top-level', packageLock.version],
      ['package-lock.json root package', packageLock.packages?.['']?.version],
    ];

    for (const [source, actual] of versions) {
      if (actual !== version) {
        return `${source} version must equal tag version ${version}; received ${JSON.stringify(actual)}`;
      }
    }

    return changelogProblem(readFile('CHANGELOG.md'), version);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Validate the tag in `args` and report the result as the CLI does: one line
 * on stdout when it is valid, otherwise one line on stderr and exit code 1.
 *
 * @param {readonly string[]} args - The command-line arguments: exactly one tag.
 * @param {(file: string) => string} readFile - Reads a repository file as UTF-8.
 * @param {{ stdout: { write(text: string): unknown }, stderr: { write(text: string): unknown }, exitCode?: number | string }} io
 *   Where to report; the CLI passes `process`.
 */
export function main(args, readFile, io) {
  const problem = releaseTagProblem(args, readFile);
  if (problem) {
    io.stderr.write(`Release validation failed: ${problem}\n`);
    io.exitCode = 1;
    return;
  }
  const version = STABLE_TAG.exec(args[0])[1];
  io.stdout.write(`Release tag ${args[0]} is valid for package version ${version}.\n`);
}

/**
 * Whether node is running `scriptPath` as this module, rather than a test
 * importing it. Compares real paths, so a symlinked checkout still runs the
 * check instead of exiting 0 without doing anything.
 *
 * @param {string} moduleUrl - `import.meta.url` of the module.
 * @param {string | undefined} scriptPath - `process.argv[1]`.
 * @returns {boolean}
 */
export function isEntryPoint(moduleUrl, scriptPath) {
  try {
    return moduleUrl === pathToFileURL(realpathSync(scriptPath)).href;
  } catch {
    return false;
  }
}

if (isEntryPoint(import.meta.url, process.argv[1])) {
  main(
    process.argv.slice(2),
    (file) => readFileSync(resolve(process.cwd(), file), 'utf8'),
    process,
  );
}
