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
export function sanitizeForTerminal(value: string, isTty: boolean): string {
  if (!isTty) return value;
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (
      (code <= 0x1f && code !== 0x09 && code !== 0x0a) ||
      code === 0x7f ||
      (code >= 0x80 && code <= 0x9f)
    ) {
      out += `\\x${code.toString(16).padStart(2, '0').toUpperCase()}`;
    } else {
      out += value[i];
    }
  }
  return out;
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
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function printTable(data: unknown): void {
  const isTty = stdoutIsTty();
  if (Array.isArray(data)) {
    if (data.length === 0) {
      process.stdout.write('(empty)\n');
      return;
    }
    const firstRow = data[0] as Record<string, unknown>;
    const keys = Object.keys(firstRow);
    const widths: number[] = [];
    for (const key of keys) {
      let max = key.length;
      for (const row of data) {
        const val = sanitizeForTerminal(String((row as Record<string, unknown>)[key] ?? ''), isTty);
        if (val.length > max) max = val.length;
      }
      widths.push(max);
    }

    const header = keys
      .map((k, i) => sanitizeForTerminal(k, isTty).padEnd(widths[i] as number))
      .join('  ');
    const separator = widths.map((w) => '-'.repeat(w)).join('  ');
    process.stdout.write(header + '\n');
    process.stdout.write(separator + '\n');

    for (const row of data) {
      const line = keys
        .map((k, i) => {
          const val = sanitizeForTerminal(String((row as Record<string, unknown>)[k] ?? ''), isTty);
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
    const maxKey = entries.reduce((max, [k]) => Math.max(max, k.length), 0);
    for (const [key, value] of entries) {
      const safeKey = sanitizeForTerminal(key, isTty);
      const safeVal = sanitizeForTerminal(String(value), isTty);
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
