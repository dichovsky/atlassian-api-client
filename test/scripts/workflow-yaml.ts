// Fail-closed parser for the YAML subset our GitHub workflows use: block
// mappings and sequences, `|`/`|-` block scalars, quoted and plain scalars,
// `{}` and flat `[a, b]` flow collections whose items hold no comma, and
// comments. Scalars stay strings.
// Anything else (anchors, tags, folded scalars, multi-line plain scalars,
// duplicate keys) throws, so a construct it does not understand can never be
// read as a weaker value. The repository has no YAML dependency; add one and
// delete this file if a workflow ever needs more.

export type YamlValue = string | null | YamlValue[] | { [key: string]: YamlValue };

interface Line {
  indent: number;
  text: string;
  number: number;
}

const KEY = /^([A-Za-z0-9_][A-Za-z0-9_.-]*|'[^']*'|"[^"]*"):(?: +(.*))?$/;
const UNSUPPORTED_START = /^[&*!%@`>?]/;
const QUOTED = /^('(?:[^']|'')*'|"(?:[^"\\]|\\.)*")/;

export function parseWorkflowYaml(source: string): YamlValue {
  const lines = source.split('\n').map((raw, index) => {
    const text = raw.trimEnd();
    if (/^ *\t/.test(text)) throw new Error(`line ${index + 1}: tab indentation`);
    return {
      indent: text.length - text.trimStart().length,
      text: text.trimStart(),
      number: index + 1,
    };
  });
  let position = 0;

  const isContent = (line: Line) => line.text !== '' && !line.text.startsWith('#');
  const peek = (): Line | undefined => {
    while (position < lines.length && !isContent(lines[position]!)) position++;
    return lines[position];
  };
  const error = (line: Line, message: string) => new Error(`line ${line.number}: ${message}`);

  function parseNode(indent: number): YamlValue {
    const line = peek()!;
    return line.text === '-' || line.text.startsWith('- ')
      ? parseSequence(line.indent)
      : parseMapping(indent);
  }

  function parseMapping(indent: number): YamlValue {
    const result: Record<string, YamlValue> = {};
    for (let line = peek(); line && line.indent === indent; line = peek()) {
      const match = KEY.exec(line.text);
      if (!match) throw error(line, `expected "key: value", got ${JSON.stringify(line.text)}`);
      const key = unquote(match[1]!);
      if (Object.hasOwn(result, key)) throw error(line, `duplicate key ${JSON.stringify(key)}`);
      position++;
      result[key] = parseValue(line, indent, match[2] ?? '');
    }
    const next = peek();
    if (next && next.indent > indent) throw error(next, 'unexpected indentation');
    return result;
  }

  function parseSequence(indent: number): YamlValue[] {
    const result: YamlValue[] = [];
    for (let line = peek(); line && line.indent === indent; line = peek()) {
      if (line.text !== '-' && !line.text.startsWith('- ')) break;
      const rest = line.text.slice(1).trimStart();
      if (rest !== '' && KEY.test(rest)) {
        // `- key: value` opens a mapping whose keys align with `key`.
        const itemIndent = line.indent + line.text.length - rest.length;
        lines[position] = { ...line, indent: itemIndent, text: rest };
        result.push(parseMapping(itemIndent));
      } else {
        position++;
        result.push(parseValue(line, indent, rest));
      }
    }
    const next = peek();
    if (next && next.indent > indent) throw error(next, 'unexpected indentation');
    return result;
  }

  function parseValue(line: Line, indent: number, text: string): YamlValue {
    if (text === '|' || text === '|-') return parseBlockScalar(indent, text === '|');
    if (text !== '' && !text.startsWith('#')) return parseInline(line, text);
    const next = peek();
    if (!next || next.indent < indent) return null;
    const isSequence = next.text === '-' || next.text.startsWith('- ');
    if (next.indent > indent || isSequence) return parseNode(next.indent);
    return null;
  }

  function parseBlockScalar(indent: number, keepFinalNewline: boolean): string {
    const body: string[] = [];
    let blockIndent: number | undefined;
    while (position < lines.length) {
      const line = lines[position]!;
      if (line.text !== '') {
        if (line.indent <= indent) break;
        blockIndent ??= line.indent;
        if (line.indent < blockIndent) throw error(line, 'block scalar line is under-indented');
      }
      body.push(line.text === '' ? '' : ' '.repeat(line.indent - blockIndent!) + line.text);
      position++;
    }
    while (body.at(-1) === '') body.pop();
    return body.join('\n') + (keepFinalNewline && body.length > 0 ? '\n' : '');
  }

  function parseInline(line: Line, text: string): YamlValue {
    const [value, rest] = splitScalar(line, text);
    if (rest !== '' && !/^\s+#/.test(rest))
      throw error(line, `trailing content ${JSON.stringify(rest)}`);
    if (value === '{}') return {};
    if (value.startsWith('[')) {
      const inner = value.slice(1, -1).trim();
      return inner === '' ? [] : inner.split(',').map((item) => scalar(line, item.trim()));
    }
    return scalar(line, value);
  }

  function splitScalar(line: Line, text: string): [string, string] {
    if (text.startsWith('[')) {
      const end = text.indexOf(']');
      if (end < 0 || /[[\]{}]/.test(text.slice(1, end)))
        throw error(line, 'unsupported flow sequence');
      return [text.slice(0, end + 1), text.slice(end + 1)];
    }
    if (text.startsWith("'") || text.startsWith('"')) {
      const quoted = QUOTED.exec(text);
      if (!quoted) throw error(line, 'unterminated quoted scalar');
      return [quoted[1]!, text.slice(quoted[1]!.length)];
    }
    const comment = /\s#/.exec(text);
    return comment ? [text.slice(0, comment.index), text.slice(comment.index)] : [text, ''];
  }

  function scalar(line: Line, text: string): string {
    if (text.startsWith("'") || text.startsWith('"')) {
      // Flow items are split on commas, so a quoted comma leaves a fragment
      // that is not one whole quoted scalar.
      if (QUOTED.exec(text)?.[1] !== text) {
        throw error(line, `unsupported scalar ${JSON.stringify(text)}`);
      }
      return unquote(text);
    }
    if (text === '' || UNSUPPORTED_START.test(text) || /^[{[]/.test(text) || /:( |$)/.test(text)) {
      throw error(line, `unsupported scalar ${JSON.stringify(text)}`);
    }
    return text;
  }

  const document = peek() ? parseNode(0) : null;
  const leftover = peek();
  if (leftover) throw error(leftover, 'unexpected content after the document');
  return document;
}

function unquote(text: string): string {
  if (text.startsWith("'")) return text.slice(1, -1).replaceAll("''", "'");
  if (text.startsWith('"')) return JSON.parse(text) as string;
  return text;
}
