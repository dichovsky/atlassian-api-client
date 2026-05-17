import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { printOutput, printError, sanitizeForTerminal } from '../../src/cli/output.js';

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

    it('prints name for a single object when neither id nor key is present', () => {
      // Arrange
      const data = { name: 'Named' };

      // Act
      printOutput(data, 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('Named\n');
    });

    it('prints empty line for a single object with no id, key, or name', () => {
      // Arrange
      const data = { foo: 'bar' };

      // Act
      printOutput(data, 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('\n');
    });

    it('prints empty line for array item with no id, key, or name', () => {
      // Act
      printOutput([{ foo: 'bar' }], 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('\n');
    });

    it('prints numeric id as string', () => {
      // Arrange
      const data = { id: 123 };

      // Act
      printOutput(data, 'minimal');

      // Assert
      expect(stdoutWrite).toHaveBeenCalledWith('123\n');
    });

    it('prints primitive array items directly', () => {
      // Act
      printOutput(['hello', 42, null], 'minimal');

      // Assert
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain('hello\n');
      expect(calls).toContain('42\n');
      expect(calls).toContain('null\n');
    });
  });

  // ── table edge cases ──────────────────────────────────────────────────────

  describe('table edge cases', () => {
    it('handles array where a value is longer than the key name', () => {
      // Arrange
      const data = [{ id: '12345678901234567890', n: 'a' }];

      // Act & Assert — should not throw
      expect(() => printOutput(data, 'table')).not.toThrow();
      expect(stdoutWrite).toHaveBeenCalled();
    });

    it('handles array with null values in rows', () => {
      // Arrange
      const data = [{ id: '1', value: null }];

      // Act
      printOutput(data, 'table');

      // Assert
      const allOutput = stdoutWrite.mock.calls.map((c) => c[0] as string).join('');
      expect(allOutput).toContain('1');
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

  it('B032: sanitises terminal-control bytes from the message when stderr is a TTY', () => {
    // Arrange: force stderr to TTY mode
    const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
    try {
      const hostile = ']0;pwnedsystem update required';

      // Act
      printError(hostile);

      // Assert: the OSC escape bytes are rendered as escaped literals,
      // not as raw control bytes
      const calls = stderrWrite.mock.calls.map((c) => c[0] as string);
      expect(calls[0]).not.toContain('');
      expect(calls[0]).not.toContain('');
      expect(calls[0]).toContain('\\x1B');
      expect(calls[0]).toContain('\\x07');
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(process.stderr, 'isTTY', ttyDescriptor);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }
    }
  });

  it('B032: preserves raw bytes when stderr is NOT a TTY (piped to file)', () => {
    // Arrange: force stderr to non-TTY mode
    const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
    Object.defineProperty(process.stderr, 'isTTY', { value: false, configurable: true });
    try {
      const hostile = ']0;pwned';

      // Act
      printError(hostile);

      // Assert
      expect(stderrWrite).toHaveBeenCalledWith(`Error: ${hostile}\n`);
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(process.stderr, 'isTTY', ttyDescriptor);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }
    }
  });
});

describe('printOutput — B027 alignment with control-byte keys (PR review)', () => {
  let stdoutWrite: MockInstance<(...args: unknown[]) => boolean>;

  beforeEach(() => {
    stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockReturnValue(true) as unknown as MockInstance<(...args: unknown[]) => boolean>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('object branch: column width tracks the SANITISED key length (no overflow)', () => {
    const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    try {
      // Key is one literal control byte (sanitises to "\x1B", 4 visible chars)
      // and a value with three control bytes (sanitises to ~12 visible chars).
      printOutput({ '': '' }, 'table');
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      // Two spaces are the column gap. The key column must be padded to at
      // least the sanitised key length (4) so the key string is not shorter
      // than its column.
      const line = calls[0] as string;
      const [keyCol] = line.split('  ');
      expect((keyCol as string).length).toBeGreaterThanOrEqual(4);
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(process.stdout, 'isTTY', ttyDescriptor);
      } else {
        delete (process.stdout as { isTTY?: boolean }).isTTY;
      }
    }
  });

  it('array branch: column width tracks the SANITISED header length', () => {
    const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    try {
      // Header key is one literal ESC; sanitises to 4 chars. Row value is a
      // single short string. The separator row uses the column width — must
      // not be shorter than the sanitised header.
      printOutput([{ '': 'v' }], 'table');
      const calls = stdoutWrite.mock.calls.map((c) => c[0] as string);
      const header = calls[0] as string;
      const separator = calls[1] as string;
      // Separator dashes match the column width — must cover the sanitised
      // header without overflowing into the column gap.
      expect(separator.length).toBeGreaterThanOrEqual(header.length);
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(process.stdout, 'isTTY', ttyDescriptor);
      } else {
        delete (process.stdout as { isTTY?: boolean }).isTTY;
      }
    }
  });
});

describe('sanitizeForTerminal (B027/B032)', () => {
  it('replaces ESC, BEL, and other C0 controls with \\xNN literals when TTY', () => {
    const input = ']0;titleok';
    expect(sanitizeForTerminal(input, true)).toBe('\\x1B]0;title\\x07ok');
  });

  it('preserves tab and newline (legitimate text bytes)', () => {
    expect(sanitizeForTerminal('a\tb\nc', true)).toBe('a\tb\nc');
  });

  it('replaces DEL (0x7F) and C1 controls (0x80–0x9F)', () => {
    const input = '';
    expect(sanitizeForTerminal(input, true)).toBe('\\x7F\\x80\\x9F');
  });

  it('preserves all bytes when isTty is false', () => {
    const input = ']0;title';
    expect(sanitizeForTerminal(input, false)).toBe(input);
  });

  it('preserves printable ASCII and Unicode', () => {
    expect(sanitizeForTerminal('Hello — 世界 ✓', true)).toBe('Hello — 世界 ✓');
  });
});

describe('printOutput — B027 TTY sanitisation', () => {
  let stdoutWrite: MockInstance<(...args: unknown[]) => boolean>;

  beforeEach(() => {
    stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockReturnValue(true) as unknown as MockInstance<(...args: unknown[]) => boolean>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitises control bytes in table rows when stdout is a TTY', () => {
    const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    try {
      printOutput([{ id: '1', summary: ']0;pwnedevil' }], 'table');
      const all = stdoutWrite.mock.calls.map((c) => c[0] as string).join('');
      expect(all).not.toContain('');
      expect(all).toContain('\\x1B');
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(process.stdout, 'isTTY', ttyDescriptor);
      } else {
        delete (process.stdout as { isTTY?: boolean }).isTTY;
      }
    }
  });

  it('sanitises control bytes in minimal format when stdout is a TTY', () => {
    const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    try {
      printOutput([{ id: '[2J[H1' }], 'minimal');
      const all = stdoutWrite.mock.calls.map((c) => c[0] as string).join('');
      expect(all).not.toContain('');
      expect(all).toContain('\\x1B');
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(process.stdout, 'isTTY', ttyDescriptor);
      } else {
        delete (process.stdout as { isTTY?: boolean }).isTTY;
      }
    }
  });
});
