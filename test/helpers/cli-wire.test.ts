/**
 * Self-tests for the CLI → wire harness (X-HS6): a run that fails or sends
 * nothing must be visible in `exitCode` / `requests`, never look like success.
 */
import { describe, expect, it } from 'vitest';
import { runCliWire } from './cli-wire.js';

describe('runCliWire', () => {
  it('reports a successful request with exit 0 and exactly one request', async () => {
    const run = await runCliWire(['jira', 'issues', 'get', 'PROJ-1'], {
      respond: { body: { id: '10001', key: 'PROJ-1' } },
    });
    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.requests).toHaveLength(1);
    expect(run.requests[0]?.method).toBe('GET');
    expect(run.requests[0]?.path).toBe('/rest/api/3/issue/PROJ-1');
    expect(JSON.parse(run.stdout)).toEqual({ id: '10001', key: 'PROJ-1' });
  });

  it('reports a pre-flight failure as a non-zero exit with no request', async () => {
    const run = await runCliWire(['confluence', 'pages', 'update', '1', '--title', 't']);
    expect(run.exitCode).toBe(1);
    expect(run.requests).toEqual([]);
    expect(run.stderr).toBe('Error: Missing required option: --version-number\n');
  });

  it('reports an HTTP error response as a non-zero exit after the request', async () => {
    const run = await runCliWire(['jira', 'issues', 'get', 'PROJ-1'], {
      respond: { status: 404, body: { errorMessages: ['Issue does not exist'] } },
    });
    expect(run.exitCode).toBe(1);
    expect(run.requests).toHaveLength(1);
    expect(run.stderr).toContain('Issue does not exist');
  });

  it('applies env overrides and unsets keys given undefined', async () => {
    const run = await runCliWire(['jira', 'issues', 'get', 'PROJ-1'], {
      env: { ATLASSIAN_API_TOKEN: undefined },
    });
    expect(run.exitCode).toBe(1);
    expect(run.requests).toEqual([]);
    expect(run.stderr).not.toBe('');
  });

  it('answers with a function of the request, empty 204s and verbatim strings', async () => {
    const seen: string[] = [];
    const run = await runCliWire(['jira', 'issues', 'delete', 'PROJ-1'], {
      respond: (req) => {
        seen.push(`${req.method} ${req.path}`);
        return { status: 204 };
      },
    });
    expect(run.exitCode).toBe(0);
    expect(seen).toEqual(['DELETE /rest/api/3/issue/PROJ-1']);

    const text = await runCliWire(['jira', 'issues', 'get', 'PROJ-1', '--format', 'minimal'], {
      respond: { body: '{"id":"7"}', headers: { 'content-type': 'application/json' } },
    });
    expect(text.exitCode).toBe(0);
    expect(text.requests).toHaveLength(1);
    expect(text.stdout).toBe('7\n');
  });

  it('restores globalThis.fetch afterwards', async () => {
    const original = globalThis.fetch;
    await runCliWire(['jira', 'issues', 'get', 'PROJ-1']);
    expect(globalThis.fetch).toBe(original);
  });
});
