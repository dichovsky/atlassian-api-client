import type { OutputFormat } from './types.js';

/**
 * Replace terminal-hijacking control bytes with their `\xNN` literal so
 * server-controlled content (issue summaries, comment bodies, error
 * messages, etc.) cannot inject escape sequences that re-paint the
 * operator's terminal (B027, B032).
 *
 * Control bytes replaced: C0 (0x00–0x1F) except `\t` and `\n`, DEL (0x7F),
 * and C1 (0x80–0x9F). These ranges carry every terminal-hijacking escape
 * (ANSI / OSC / DCS / CSI).
 *
 * Only sanitises when the target stream is a TTY; when stdout/stderr is
 * piped to a file or another process, the raw bytes are preserved so logs
 * stay faithful to wire content.
 */
function isTerminalControl(code: number): boolean {
  return (
    (code <= 0x1f && code !== 0x09 && code !== 0x0a) ||
    code === 0x7f ||
    (code >= 0x80 && code <= 0x9f)
  );
}

export function sanitizeForTerminal(value: string, isTty: boolean): string {
  if (!isTty) return value;

  // Fast path: scan once with a tight loop; if no control bytes are present
  // (the common case for almost every legitimate Atlassian payload), return
  // the input string by reference instead of building a chunk array. Raised
  // in PR review as a perf concern for long error payloads / descriptions.
  let firstControl = -1;
  for (let i = 0; i < value.length; i++) {
    if (isTerminalControl(value.charCodeAt(i))) {
      firstControl = i;
      break;
    }
  }
  if (firstControl === -1) return value;

  // Slow path: build the sanitised form as an array of chunks and `join`
  // once at the end, avoiding O(n²) string concatenation.
  const chunks: string[] = [value.slice(0, firstControl)];
  for (let i = firstControl; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (isTerminalControl(code)) {
      chunks.push(`\\x${code.toString(16).padStart(2, '0').toUpperCase()}`);
    } else {
      chunks.push(value[i] as string);
    }
  }
  return chunks.join('');
}

function stdoutIsTty(): boolean {
  return process.stdout.isTTY === true;
}

function stderrIsTty(): boolean {
  return process.stderr.isTTY === true;
}

/** Format and print data to stdout based on the selected format. */
export function printOutput(data: unknown, format: OutputFormat): void {
  switch (format) {
    case 'json':
      printJson(data);
      break;
    case 'table':
      printTable(data);
      break;
    case 'minimal':
      printMinimal(data);
      break;
  }
}

function printJson(data: unknown): void {
  // `JSON.stringify` only escapes C0 controls (0x00–0x1F), backslash and
  // double quote. DEL (0x7F) and C1 bytes (0x80–0x9F) are emitted RAW,
  // so `--format json` on a TTY would still render server-controlled
  // terminal escapes from issue/page bodies, defeating the B027/B032
  // mitigation that already protects table/minimal output.
  //
  // PR review (round 4): `sanitizeForTerminal` emits `\xNN` for those
  // bytes — which is unambiguous in a terminal but produces INVALID
  // JSON (`\x` is not a recognised JSON escape sequence). For the JSON
  // output path we instead use `sanitizeForJson`, which emits the
  // JSON-valid `\u00NN` form so a downstream `JSON.parse` of the
  // captured stdout still works.
  //
  // PR review (round 3): `JSON.stringify` can return `undefined` for
  // top-level values of type `undefined`, function, or symbol. Fall back
  // to the literal `"undefined"` rendering so the call never crashes.
  const raw = JSON.stringify(data, null, 2);
  const serialised = raw === undefined ? 'undefined' : raw;
  process.stdout.write(sanitizeForJson(serialised, stdoutIsTty()) + '\n');
}

/**
 * TTY-safe sanitiser that preserves JSON validity. Escapes the same
 * terminal-control byte ranges as `sanitizeForTerminal` (DEL, C1) but
 * emits them as the JSON-valid `\u00NN` form instead of the human-
 * friendly `\xNN` form. The standard C0 range below 0x20 is already
 * `\uNNNN`-escaped by `JSON.stringify` itself, so it never reaches
 * this function in a non-string position — but we still escape it
 * defensively in case the input is a non-JSON string (e.g. the
 * "undefined" fallback). When stdout is NOT a TTY, the input is
 * returned unchanged for log fidelity.
 */
export function sanitizeForJson(value: string, isTty: boolean): string {
  if (!isTty) return value;

  let firstControl = -1;
  for (let i = 0; i < value.length; i++) {
    if (isTerminalControl(value.charCodeAt(i))) {
      firstControl = i;
      break;
    }
  }
  if (firstControl === -1) return value;

  const chunks: string[] = [value.slice(0, firstControl)];
  for (let i = firstControl; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (isTerminalControl(code)) {
      chunks.push('\\u' + code.toString(16).padStart(4, '0'));
    } else {
      chunks.push(value[i] as string);
    }
  }
  return chunks.join('');
}

/**
 * Read a column cell from a table row. Returns `undefined` when the row is not
 * a keyed object (a `null` or primitive element inside an otherwise-object
 * array) so reading `null[key]` cannot throw and a stray primitive renders as
 * an empty cell instead of crashing the whole table.
 */
function cellValue(row: unknown, key: string): unknown {
  return row !== null && typeof row === 'object'
    ? (row as Record<string, unknown>)[key]
    : undefined;
}

function printTable(data: unknown): void {
  const isTty = stdoutIsTty();
  if (Array.isArray(data)) {
    if (data.length === 0) {
      process.stdout.write('(empty)\n');
      return;
    }
    // A columnar table can only be derived from keyed objects. When the first
    // element is `null` or a primitive there are no columns: `Object.keys(null)`
    // throws and `Object.keys('ab')` yields per-character indices that render as
    // garbage columns. Fall back to one stringified value per line — matching
    // `printMinimal`/`printJson`, which already handle these inputs gracefully.
    const firstRow = data[0];
    if (firstRow === null || typeof firstRow !== 'object') {
      for (const item of data) {
        process.stdout.write(sanitizeForTerminal(String(item), isTty) + '\n');
      }
      return;
    }
    const keys = Object.keys(firstRow);
    // PR review: column widths must be computed from SANITISED string
    // lengths. If a header key or row value contains control bytes, the
    // sanitised form expands to `\xNN` and would otherwise overflow the
    // column and break alignment.
    const safeKeys = keys.map((k) => sanitizeForTerminal(k, isTty));
    const widths: number[] = [];
    for (let i = 0; i < keys.length; i++) {
      let max = (safeKeys[i] as string).length;
      const key = keys[i] as string;
      for (const row of data) {
        const val = sanitizeForTerminal(String(cellValue(row, key) ?? ''), isTty);
        if (val.length > max) max = val.length;
      }
      widths.push(max);
    }

    const header = safeKeys.map((k, i) => k.padEnd(widths[i] as number)).join('  ');
    const separator = widths.map((w) => '-'.repeat(w)).join('  ');
    process.stdout.write(header + '\n');
    process.stdout.write(separator + '\n');

    for (const row of data) {
      const line = keys
        .map((k, i) => {
          const val = sanitizeForTerminal(String(cellValue(row, k) ?? ''), isTty);
          return val.padEnd(widths[i] as number);
        })
        .join('  ');
      process.stdout.write(line + '\n');
    }
    return;
  }

  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj);
    // PR review: compute column width from the SANITISED key length so a key
    // containing control bytes (which expand to `\xNN`) doesn't break the
    // padding/alignment of the rest of the table.
    const safeEntries = entries.map(
      ([k, v]) => [sanitizeForTerminal(k, isTty), sanitizeForTerminal(String(v), isTty)] as const,
    );
    const maxKey = safeEntries.reduce((max, [k]) => Math.max(max, k.length), 0);
    for (const [safeKey, safeVal] of safeEntries) {
      process.stdout.write(`${safeKey.padEnd(maxKey)}  ${safeVal}\n`);
    }
    return;
  }

  process.stdout.write(sanitizeForTerminal(String(data), isTty) + '\n');
}

function printMinimal(data: unknown): void {
  const isTty = stdoutIsTty();
  if (Array.isArray(data)) {
    for (const item of data) {
      process.stdout.write(sanitizeForTerminal(extractId(item), isTty) + '\n');
    }
    return;
  }

  if (data !== null && typeof data === 'object') {
    process.stdout.write(sanitizeForTerminal(extractId(data), isTty) + '\n');
    return;
  }

  process.stdout.write(sanitizeForTerminal(String(data), isTty) + '\n');
}

function extractId(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return String(obj);
  const record = obj as Record<string, unknown>;
  if (typeof record['id'] === 'string' || typeof record['id'] === 'number')
    return String(record['id']);
  if (typeof record['key'] === 'string') return record['key'];
  if (typeof record['name'] === 'string') return record['name'];
  return '';
}

/** Print an error message to stderr (sanitised for TTY safety — B032). */
export function printError(message: string): void {
  const safe = sanitizeForTerminal(message, stderrIsTty());
  process.stderr.write(`Error: ${safe}\n`);
}
