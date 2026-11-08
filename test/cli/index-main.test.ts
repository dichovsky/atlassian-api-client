/**
 * F286: src/cli/index.ts counts toward the
 * 100% coverage gate, so the bin entry `main()` and runCli's non-Error catch
 * path are driven directly here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main, runCli } from '../../src/cli/index.js';

describe('bin entry main()', () => {
  const exitCodeBefore = process.exitCode;
  afterEach(() => {
    process.exitCode = exitCodeBefore;
    vi.restoreAllMocks();
  });

  it('writes CLI output lines to process.stdout and leaves exitCode on success', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await main(['node', 'atlas', '--version']);
    expect(out).toHaveBeenCalledWith(expect.stringMatching(/^atlas v\S+\n$/));
    expect(process.exitCode).toBe(exitCodeBefore);
  });

  it('writes CLI error lines to process.stderr and sets exitCode 1 on failure', async () => {
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await main(['node', 'atlas', 'scopes']);
    expect(err).toHaveBeenCalledWith(
      'Error: atlas scopes requires an action. Try: atlas scopes validate <scope...>\n',
    );
    expect(process.exitCode).toBe(1);
  });

  it('runCli maps a non-Error throw to exit 1 with its string form', async () => {
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const throwingWriter = (): void => {
      // A writer can fail with any value; runCli must still report it, not reject.
      throw 'stdout closed';
    };
    const code = await runCli(['node', 'atlas', '--version'], throwingWriter, () => undefined);
    expect(code).toBe(1);
    expect(err).toHaveBeenCalledWith('Error: stdout closed\n');
  });
});
