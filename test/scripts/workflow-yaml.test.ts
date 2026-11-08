import { describe, expect, it } from 'vitest';
import { parseWorkflowYaml } from './workflow-yaml.js';

describe('workflow YAML subset parser', () => {
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

  it.each([
    ['a duplicate key', 'a: 1\na: 2'],
    ['an anchor', 'a: &x 1'],
    ['an alias', 'a: *x'],
    ['a tag', 'a: !!str 1'],
    ['a folded scalar', 'a: >\n  text'],
    ['a multi-line plain scalar', 'a: one\n  two'],
    ['a non-empty flow mapping', 'a: {b: c}'],
    ['a nested flow sequence', 'a: [[b]]'],
    ['a comma inside a single-quoted flow item', "a: ['pre,flight', publish]"],
    ['a comma inside a double-quoted flow item', 'a: ["pre,flight", publish]'],
    ['a quote left open in a flow item', "a: ['b, c]"],
    ['a value containing ": "', 'a: b: c'],
    ['tab indentation', 'a:\n\tb: c'],
    ['an unterminated quote', "a: 'b"],
    ['content after a quoted scalar', "a: 'b' c"],
    ['a dedented trailing line', 'a:\n    b: c\n  d: e'],
  ])('rejects %s instead of guessing', (_label, source) => {
    expect(() => parseWorkflowYaml(source)).toThrow();
  });
});
