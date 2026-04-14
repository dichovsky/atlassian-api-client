import type { OutputFormat } from './types.js';

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
        const val = String((row as Record<string, unknown>)[key] ?? '');
        if (val.length > max) max = val.length;
      }
      widths.push(max);
    }

    const header = keys.map((k, i) => k.padEnd(widths[i] as number)).join('  ');
    const separator = widths.map((w) => '-'.repeat(w)).join('  ');
    process.stdout.write(header + '\n');
    process.stdout.write(separator + '\n');

    for (const row of data) {
      const line = keys
        .map((k, i) => {
          const val = String((row as Record<string, unknown>)[k] ?? '');
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
      process.stdout.write(`${key.padEnd(maxKey)}  ${String(value)}\n`);
    }
    return;
  }

  process.stdout.write(String(data) + '\n');
}

function printMinimal(data: unknown): void {
  if (Array.isArray(data)) {
    for (const item of data) {
      process.stdout.write(extractId(item) + '\n');
    }
    return;
  }

  if (data !== null && typeof data === 'object') {
    process.stdout.write(extractId(data) + '\n');
    return;
  }

  process.stdout.write(String(data) + '\n');
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

/** Print an error message to stderr. */
export function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}
