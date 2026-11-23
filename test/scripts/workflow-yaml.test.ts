import { describe, expect, it } from 'vitest';
import { parseWorkflowYaml } from './workflow-yaml.js';

describe('workflow YAML parser', () => {
  it('parses the constructs the workflows use', () => {
    const source = [
      'on:',
      '  push:',
      "    tags: ['v*'] # trailing comment",
      'permissions: {}',
      'jobs:',
      '  build:',
      '    needs: [a, "b"]',
      '    environment:',
      '    steps:',
      '      - uses: actions/checkout@abc # v1',
      '        with:',
      "          node-version: '24'",
      '      - run: |',
      '          echo "# not a comment"',
      '',
      '          echo two',
      '',
      '      - run: |-',
      '          kept',
      '      - plain scalar',
      'list:',
      '- x',
      "quoted: 'it''s'",
      '',
    ].join('\n');

    expect(parseWorkflowYaml(source)).toEqual({
      on: { push: { tags: ['v*'] } },
      permissions: {},
      jobs: {
        build: {
          needs: ['a', 'b'],
          environment: null,
          steps: [
            { uses: 'actions/checkout@abc', with: { 'node-version': '24' } },
            { run: 'echo "# not a comment"\n\necho two\n' },
            { run: 'kept' },
            'plain scalar',
          ],
        },
      },
      list: ['x'],
      quoted: "it's",
    });
  });

  it('reads flow mappings, anchored steps and folded run commands', () => {
    const source = [
      'on: [push]',
      'jobs:',
      '  build:',
      '    steps: &steps',
      '      - run: >-',
      '          npm run',
      '          validate',
      '  test:',
      '    needs: ["build, scan", build]',
      '    steps: *steps',
      '    strategy: {fail-fast: false, matrix: {node: [24, 26]}}',
    ].join('\n');

    const steps = [{ run: 'npm run validate' }];
    expect(parseWorkflowYaml(source)).toEqual({
      on: ['push'],
      jobs: {
        build: { steps },
        test: {
          needs: ['build, scan', 'build'],
          steps,
          strategy: { 'fail-fast': false, matrix: { node: [24, 26] } },
        },
      },
    });
  });

  it.each([
    ['a duplicate key', 'a: 1\na: 2'],
    ['an unresolved alias', 'a: *missing'],
    ['an unknown tag', 'a: !unknown text'],
    ['multiple documents', 'on: push\n---\non: pull_request'],
    ['an unterminated quote', "a: 'b"],
    ['incorrect indentation', 'a:\n    b: c\n  d: e'],
  ])('rejects %s', (_label, source) => {
    expect(() => parseWorkflowYaml(source)).toThrow();
  });
});
