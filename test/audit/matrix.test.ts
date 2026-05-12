import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..', '..');
const MATRIX = resolve(repoRoot, 'spec', 'coverage-matrix.md');
const AUDIT_DIR = resolve(repoRoot, 'spec', 'audit');

/**
 * These tests guard the audit-script invariants without re-running the
 * scripts at test time. The `npm run audit:spec -- --check` step in the
 * `validate` script handles drift detection; this suite confirms the
 * committed artifacts exist and conform to the documented structure.
 */
describe('spec coverage matrix', () => {
  it('writes a global coverage-matrix.md to spec/', () => {
    expect(existsSync(MATRIX)).toBe(true);
  });

  it('global matrix declares all four sections', () => {
    const md = readFileSync(MATRIX, 'utf8');
    expect(md).toMatch(/^# Confluence v2 — Coverage Matrix/m);
    expect(md).toMatch(/## Matched \(implemented\)/);
    expect(md).toMatch(/## Missing in code/);
    expect(md).toMatch(/## Extra in code/);
    expect(md).toMatch(/## Deprecated in spec/);
  });

  it('global matrix cites the pinned spec snapshot', () => {
    const md = readFileSync(MATRIX, 'utf8');
    expect(md).toContain('spec/confluence-v2.openapi.json');
    expect(md).toMatch(/213 operations/);
  });

  it('global matrix reports the implemented coverage ratio', () => {
    const md = readFileSync(MATRIX, 'utf8');
    expect(md).toMatch(/\*\*Implemented:\*\* \d+ \/ 213/);
  });

  it('global matrix references at least one known operation by operationId', () => {
    const md = readFileSync(MATRIX, 'utf8');
    expect(md).toContain('`getPages`');
    expect(md).toContain('`getSpaces`');
  });
});

describe('per-resource audit reports', () => {
  const KNOWN_TAGS = [
    'admin-key',
    'app-properties',
    'attachment',
    'blog-post',
    'classification-level',
    'comment',
    'content',
    'content-properties',
    'custom-content',
    'data-policies',
    'database',
    'folder',
    'label',
    'like',
    'operation',
    'page',
    'redactions',
    'smart-link',
    'space',
    'space-permissions',
    'space-properties',
    'space-roles',
    'task',
    'user',
    'version',
    'whiteboard',
  ];

  it.each(KNOWN_TAGS)('writes spec/audit/%s.md', (slug) => {
    const path = resolve(AUDIT_DIR, `${slug}.md`);
    expect(existsSync(path), `${path} should exist`).toBe(true);
  });

  it('audit reports include backlog-item links for known tags', () => {
    const page = readFileSync(resolve(AUDIT_DIR, 'page.md'), 'utf8');
    expect(page).toMatch(/Target backlog item\(s\): \*\*B024, B035\*\*/);
    const database = readFileSync(resolve(AUDIT_DIR, 'database.md'), 'utf8');
    expect(database).toMatch(/Target backlog item\(s\): \*\*B045\*\*/);
  });

  it('audit reports cite the pinned spec snapshot', () => {
    const space = readFileSync(resolve(AUDIT_DIR, 'space.md'), 'utf8');
    expect(space).toContain('spec/confluence-v2.openapi.json');
  });

  it('audit reports declare matched + missing-in-code sections', () => {
    const attachment = readFileSync(resolve(AUDIT_DIR, 'attachment.md'), 'utf8');
    expect(attachment).toMatch(/### Matched/);
    expect(attachment).toMatch(/### Missing in code/);
    expect(attachment).toMatch(/### Deprecated in spec/);
  });
});
