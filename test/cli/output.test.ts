import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { printOutput, printError } from '../../src/cli/output.js';

describe('printOutput', () => {
  // Typed as a spy returning boolean, which matches mockReturnValue(true)
  let stdoutWrite: MockInstance<(...args: unknown[]) => boolean>;

  beforeEach(() => {
    stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockReturnValue(true) as unknown as MockInstance<(...args: unknown[]) => boolean>;
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── json format ───────────────────────────────────────────────────────────

  describe('json format', () => {
    it('JSON-stringifies an array with 2-space indentation', () => {
      // Arrange
      const data = [{ id: '1', key: 'PROJ-1' }];

      // Act
      printOutput(data, 'json');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith(JSON.stringify(data, null, 2) + '\n');
    });

    it('JSON-stringifies an object', () => {
      // Arrange
      const data = { id: '1', key: 'PROJ-1', summary: 'Test' };

      // Act
      printOutput(data, 'json');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith(JSON.stringify(data, null, 2) + '\n');
    });
  });

  // ── table format ──────────────────────────────────────────────────────────

  describe('table format', () => {
    it('prints header and rows for an array of objects', () => {
      // Arrange
      const data = [
        { id: '1', key: 'PROJ-1', summary: 'First issue' },
        { id: '2', key: 'PROJ-2', summary: 'Second issue' },
      ];

      // Act
      printOutput(data, 'table');

      // Assert
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      // Header row should contain column names
      expect(calls[0]).toContain('id');
      expect(calls[0]).toContain('key');
      expect(calls[0]).toContain('summary');
      // Data rows should contain values
      const allOutput = calls.join('');
      expect(allOutput).toContain('PROJ-1');
      expect(allOutput).toContain('PROJ-2');
    });

    it('prints "(empty)" for an empty array', () => {
      // Act
      printOutput([], 'table');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('(empty)\n');
    });

    it('prints key-value pairs for a single object', () => {
      // Arrange
      const data = { id: '42', key: 'PROJ-42' };

      // Act
      printOutput(data, 'table');

      // Assert
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      const allOutput = calls.join('');
      expect(allOutput).toContain('id');
      expect(allOutput).toContain('42');
      expect(allOutput).toContain('key');
      expect(allOutput).toContain('PROJ-42');
    });

    it('prints string representation for non-object scalar values', () => {
      // Act
      printOutput('just a string', 'table');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('just a string\n');
    });

    it('prints null representation correctly', () => {
      // Act
      printOutput(null, 'table');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('null\n');
    });

    it('handles array with undefined field values', () => {
      // Arrange
      const data = [{ id: '1', key: undefined, summary: 'Test' }];

      // Act & Assert — should not throw
      expect(() => printOutput(data, 'table')).not.toThrow();
      expect(stdoutWrite).toHaveBeenCalled();
    });
  });

  // ── minimal format ────────────────────────────────────────────────────────

  describe('minimal format', () => {
    it('prints the id of each item in an array', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];

      // Act
      printOutput(data, 'minimal');

      // Assert
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain('1\n');
      expect(calls).toContain('2\n');
      expect(calls).toContain('3\n');
    });

    it('falls back to key when id is absent', () => {
      // Arrange
      const data = [{ key: 'PROJ-1' }, { key: 'PROJ-2' }];

      // Act
      printOutput(data, 'minimal');

      // Assert
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain('PROJ-1\n');
      expect(calls).toContain('PROJ-2\n');
    });

    it('falls back to name when neither id nor key is present', () => {
      // Arrange
      const data = [{ name: 'Bug' }, { name: 'Story' }];

      // Act
      printOutput(data, 'minimal');

      // Assert
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain('Bug\n');
      expect(calls).toContain('Story\n');
    });

    it('prints id for a single object', () => {
      // Arrange
      const data = { id: 'abc-123' };

      // Act
      printOutput(data, 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('abc-123\n');
    });

    it('prints key for a single object when id is absent', () => {
      // Arrange
      const data = { key: 'PROJ-99' };

      // Act
      printOutput(data, 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('PROJ-99\n');
    });

    it('prints a raw string as-is', () => {
      // Act
      printOutput('plain-string', 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('plain-string\n');
    });
  });
});

describe('printError', () => {
  let stderrWrite: MockInstance<(...args: unknown[]) => boolean>;

  beforeEach(() => {
    stderrWrite = vi
      .spyOn(process.stderr, 'write')
      .mockReturnValue(true) as unknown as MockInstance<(...args: unknown[]) => boolean>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes error message prefixed with "Error: " to stderr', () => {
    // Act
    printError('Something went wrong');

    // Assert
    expect(stderrWrite).toHaveBeenCalledWith('Error: Something went wrong\n');
  });

  it('does not write to stdout', () => {
    // Arrange
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    // Act
    printError('failure');

    // Assert
    expect(stdoutWrite).not.toHaveBeenCalled();
  });
});
