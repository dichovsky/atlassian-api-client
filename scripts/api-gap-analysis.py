#!/usr/bin/env python3
"""Atlassian SDK coverage gap analysis — deterministic auto-diff.

CI coverage guard and standalone audit tool. Extracts every transport-backed
operation path+verb from compiled TypeScript sources under
src/{jira,confluence}/resources (including delegated helper call sites and
resolving each resource's base-URL prefix from the client wiring), normalizes
path params, and diffs against the three official Atlassian OpenAPI specs to
list unimplemented operations.

Usage:
  python3 scripts/api-gap-analysis.py
  python3 scripts/api-gap-analysis.py --spec-dir /path/to/spec
  python3 scripts/api-gap-analysis.py --source-root /path/to/repository
  python3 scripts/api-gap-analysis.py --out-dir /path/to/audit-artifacts

Reads the reviewed snapshots in spec/. Refresh them using spec/README.md before a live audit.
Writes gap_candidates.json + unmatched_sdk.json to a unique temporary directory
by default, or to --out-dir when supplied.

Candidates are starting points only — each must be verified against the spec +
BACKLOG-ARCHIVE.md before being treated as a real gap (the diff cannot tell an
alternate-prefix duplicate or a deprecated-superseded alias from a true gap).
"""
import argparse, functools, json, re, os, glob, sys, tempfile
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARSER = argparse.ArgumentParser(description="Check SDK route coverage against pinned Atlassian specs")
PARSER.add_argument(
    "--spec-dir",
    default=os.path.join(ROOT, "spec"),
    help="directory containing the three pinned OpenAPI documents",
)
PARSER.add_argument(
    "--source-root",
    default=ROOT,
    help="repository root containing src/{jira,confluence}",
)
PARSER.add_argument(
    "--out-dir",
    help="directory for gap_candidates.json and unmatched_sdk.json",
)
CLI_ARGS = PARSER.parse_args()

SPEC_FILES = {
    "jira-platform": "jira-platform-v3.json",
    "jira-software": "jira-software.json",
    "confluence-v2": "confluence-v2.json",
}

EXPECTED_SERVER_SCOPES = {
    "jira-platform": "",
    "jira-software": "",
    "confluence-v2": "/wiki/api/v2",
}

HTTP_METHODS = {
    "delete", "get", "head", "options", "patch", "post", "put", "trace",
}

PATH_ITEM_FIELDS = HTTP_METHODS | {
    "$ref", "description", "parameters", "servers", "summary",
}

ROUTE_PRESERVING_PRIMITIVES = {
    "appendRepeatedParams",
    "appendScalarOrArrayParam",
}

UNICODE_ESCAPE = re.compile(r"\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]+\})")
STATIC_NULL = object()
IDENTIFIER_NAME = (
    r"(?:[A-Za-z0-9_$]|\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]+\}))+"
)

METHOD_DECLARATION = re.compile(
    r"(?<![A-Za-z0-9_$\.\]])"
    r"(?P<modifiers>(?:(?:public|protected|private|static|abstract|override|async)\s+)*)"
    r"(?:get\s+|set\s+)?\*?\s*"
    r"(?P<method>[A-Za-z_$][A-Za-z0-9_$]*|#[A-Za-z_$][A-Za-z0-9_$]*"
    r"|[0-9]+(?:\.[0-9]+)?|\[[^\]]*\])"
    r"\s*(?:<[^;{}()]*>)?\s*\("
)

CONTROL_HEADS = {"catch", "for", "if", "switch", "while", "with"}

def match_close(s, start, op, cl):
    depth = 0
    for i in range(start, len(s)):
        if s[i] == op: depth += 1
        elif s[i] == cl:
            depth -= 1
            if depth == 0: return i + 1
    return -1

def match_open(s, end, op, cl):
    """Return the opening delimiter paired with ``s[end]``."""
    depth = 0
    for index in range(end, -1, -1):
        if s[index] == cl:
            depth += 1
        elif s[index] == op:
            depth -= 1
            if depth == 0:
                return index
    return -1

def match_type_arguments_end(code, start):
    """Return the offset after a TypeScript type-argument list.

    Unlike a generic delimiter matcher, this must not treat the ``>`` in an
    arrow token (``=>``) as the end of ``request<{ fn: () => value }>(...)``.
    The input is the literal-masked code view, so angle brackets here are
    executable TypeScript punctuation rather than string content.
    """
    depth = 0
    for index in range(start, len(code)):
        token = code[index]
        if token == "<":
            depth += 1
        elif token == ">" and not (index > start and code[index - 1] == "="):
            depth -= 1
            if depth == 0:
                return index + 1
    return -1

def find_request_call_objects(code):
    """Return ``(member, call-paren, object)`` offsets for request calls.

    A bare reference to ``this.transport.request`` is not an implementation.
    Bind extraction to an optional TypeScript type-argument list, the call
    parenthesis, and an object literal as the first argument.
    """
    calls = []
    unsupported = []
    for member in re.finditer(r"\bthis\.transport\.request\b", code):
        cursor = member.end()
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor < len(code) and code[cursor] == "<":
            cursor = match_type_arguments_end(code, cursor)
            if cursor == -1:
                unsupported.append(member.start())
                continue
            while cursor < len(code) and code[cursor].isspace():
                cursor += 1
        if cursor >= len(code) or code[cursor] != "(":
            unsupported.append(member.start())
            continue
        call_paren = cursor
        cursor += 1
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor < len(code) and code[cursor] == "{":
            calls.append((member.start(), call_paren, cursor))
        else:
            unsupported.append(member.start())
    return calls, unsupported

def decode_identifier_escapes(value):
    """Decode JavaScript Unicode escapes used inside identifiers/properties."""
    def replace(match):
        digits = match.group(0)[2:]
        if digits.startswith("{"):
            digits = digits[1:-1]
        try:
            codepoint = int(digits, 16)
            return chr(codepoint) if codepoint <= 0x10FFFF else "\ufffd"
        except (ValueError, OverflowError):
            return "\ufffd"

    return UNICODE_ESCAPE.sub(replace, value)

def executable_member_accesses(source, code):
    """Return executable dotted/static-bracket member accesses.

    The accepted request extractor intentionally recognizes only the canonical
    ``this.transport.request({...})`` shape. This broader audit decodes legal
    identifier escapes and static string keys so equivalent or aliased access
    cannot disappear from the fail-closed accounting pass.
    """
    assert len(source) == len(code), "source/code views must stay aligned"
    accesses = []
    for member in re.finditer(r"\.\s*(" + IDENTIFIER_NAME + r")", code):
        accesses.append((
            member.start(),
            member.start(1),
            member.end(),
            decode_identifier_escapes(member.group(1)),
        ))

    static_property = re.compile(
        r"\[\s*(?:'(?P<single>(?:\\.|[^'\\])*)'"
        r'|"(?P<double>(?:\\.|[^"\\])*)")\s*\]'
    )
    for member in static_property.finditer(source):
        # A property-like substring inside a comment/string/template raw
        # segment is blank in the aligned executable-code view.
        if code[member.start()] != "[" or code[member.end() - 1] != "]":
            continue
        raw_name = member.group("single")
        if raw_name is None:
            raw_name = member.group("double")
        accesses.append((
            member.start(),
            member.start(),
            member.end(),
            decode_identifier_escapes(raw_name),
        ))
    return sorted(accesses)

def executable_computed_member_invocations(code):
    """Return dynamic bracket-member calls that cannot be name-proven safe."""
    return list(re.finditer(
        r"\]\s*(?:\?\.\s*)?(?:<[^;{}]*>)?\s*\(",
        code,
    ))

@functools.lru_cache(maxsize=None)
def named_import_bindings(source, code):
    """Return ``(imported, local, module)`` named-import bindings."""
    assert len(source) == len(code), "source/code views must stay aligned"
    bindings = []
    for imported in re.finditer(
        r"\bimport\s*\{(?P<bindings>[^}]*)\}\s*from\b",
        code,
    ):
        module_match = re.match(
            r"\s*(['\"])(?P<module>[^'\"]+)\1",
            source[imported.end():],
        )
        if not module_match:
            continue
        for raw_binding in imported.group("bindings").split(","):
            binding = re.fullmatch(
                r"\s*(?:type\s+)?([A-Za-z_$][A-Za-z0-9_$]*)"
                r"(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?\s*",
                raw_binding,
            )
            if binding:
                bindings.append((
                    binding.group(1),
                    binding.group(2) or binding.group(1),
                    module_match.group("module"),
                ))
    return tuple(bindings)

def quoted_method_code_view(source, code):
    """Expose executable quoted PropertyNames as aligned synthetic identifiers."""
    assert len(source) == len(code), "source/code views must stay aligned"
    view = list(code)
    quoted = re.compile(
        r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\""
    )
    for literal in quoted.finditer(source):
        if code[literal.start():literal.end()].strip():
            continue
        cursor = literal.end()
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor < len(code) and code[cursor] == "<":
            cursor = match_type_arguments_end(code, cursor)
            if cursor == -1:
                continue
            while cursor < len(code) and code[cursor].isspace():
                cursor += 1
        if cursor < len(code) and code[cursor] == "(":
            view[literal.start()] = "m"
    return "".join(view)

@functools.lru_cache(maxsize=None)
def method_declaration_spans(code):
    """Return method parameter/body spans, parent braces, and visibility."""
    declarations = []
    for method in METHOD_DECLARATION.finditer(code):
        method_name = method.group("method")
        if method_name in CONTROL_HEADS:
            continue
        params_open = code.index("(", method.start(), method.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            continue
        cursor = params_end
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor < len(code) and code[cursor] == ":":
            cursor += 1
            angle = paren = bracket = 0
            seen_type_token = False
            while cursor < len(code):
                token = code[cursor]
                if token == "<":
                    angle += 1
                elif token == ">" and angle:
                    angle -= 1
                elif token == "(":
                    paren += 1
                elif token == ")" and paren:
                    paren -= 1
                elif token == "[":
                    bracket += 1
                elif token == "]" and bracket:
                    bracket -= 1
                elif token == "{":
                    previous = cursor - 1
                    while previous >= params_end and code[previous].isspace():
                        previous -= 1
                    if (
                        angle or paren or bracket or not seen_type_token
                        or (previous >= 0 and code[previous] in "|&")
                        or code[max(0, previous - 1):previous + 1] == "=>"
                    ):
                        type_end = match_close(code, cursor, "{", "}")
                        if type_end == -1:
                            cursor = -1
                            break
                        cursor = type_end
                        seen_type_token = True
                        continue
                    break
                elif not token.isspace():
                    seen_type_token = True
                cursor += 1
        if cursor == -1:
            continue
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor >= len(code) or code[cursor] != "{":
            continue
        body_start = cursor
        body_end = match_close(code, body_start, "{", "}")
        if body_end == -1:
            continue
        modifiers = method.group("modifiers").split()
        visibility = next(
            (modifier for modifier in modifiers if modifier in {"private", "protected"}),
            "private"
            if method_name.startswith("#")
            else "static"
            if "static" in modifiers
            else "public",
        )
        declarations.append((
            params_open + 1,
            params_end - 1,
            body_start,
            body_end,
            brace_parent_map(code).get(body_start),
            visibility,
            method_name,
        ))
    return tuple(declarations)

@functools.lru_cache(maxsize=None)
def callable_parameter_spans(code):
    """Return conservative spans for function/method/arrow parameters."""
    spans = set()

    def add_params(open_paren):
        close = match_close(code, open_paren, "(", ")")
        if close != -1:
            spans.add((open_paren + 1, close - 1))
        return close

    for function in re.finditer(
        r"\bfunction\b(?:\s*\*)?(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?"
        r"\s*(?:<[^;{}()]*>)?\s*\(",
        code,
    ):
        add_params(code.index("(", function.start(), function.end()))
    for constructor in re.finditer(r"\bconstructor\s*\(", code):
        add_params(code.index("(", constructor.start(), constructor.end()))

    spans.update(
        (params_start, params_end)
        for params_start, params_end, *_ in method_declaration_spans(code)
    )

    # Parenthesized arrow parameters, including defaults.
    for arrow in re.finditer(r"=>", code):
        previous = arrow.start() - 1
        while previous >= 0 and code[previous].isspace():
            previous -= 1
        params_close = previous if previous >= 0 and code[previous] == ")" else -1
        if params_close == -1:
            candidate = code.rfind(")", 0, arrow.start())
            if candidate != -1 and re.fullmatch(
                r"\s*:[^;={}]*",
                code[candidate + 1:arrow.start()],
            ):
                params_close = candidate
        if params_close != -1:
            open_paren = match_open(code, params_close, "(", ")")
            if open_paren != -1:
                spans.add((open_paren + 1, params_close))
    return tuple(sorted(spans))

def has_nonimport_binding(code, name):
    """Conservatively reject any lexical/value shadow of an import binding."""
    target = re.escape(name)
    if re.search(
        r"\b(?:const|let|var|function|class|enum|namespace)\s+" + target + r"\b",
        code,
    ):
        return True
    for declaration in re.finditer(r"\b(?:const|let|var)\b", code):
        cursor = declaration.end()
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor >= len(code) or code[cursor] not in "{[":
            continue
        close_token = "}" if code[cursor] == "{" else "]"
        binding_end = match_close(code, cursor, code[cursor], close_token)
        if (
            binding_end != -1
            and re.search(r"\b" + target + r"\b", code[cursor:binding_end])
        ):
            return True
    if re.search(r"\bcatch\s*\([^)]*\b" + target + r"\b", code):
        return True
    for start, end in callable_parameter_spans(code):
        if re.search(r"\b" + target + r"\b", code[start:end]):
            return True
    # Single-identifier arrow parameters have no parenthesized span.
    if re.search(
        r"(?<![A-Za-z0-9_$])" + target
        + r"\s*(?::[^=;{},]+)?=>",
        code,
    ):
        return True
    return False

def trusted_named_imports(source, code, approved_names, module_pattern):
    """Return unshadowed local bindings for approved named imports."""
    imports = named_import_bindings(source, code)
    by_local = {}
    for imported, local, module in imports:
        by_local.setdefault(local, []).append((imported, module))
    trusted = {}
    binding_code = quoted_method_code_view(source, code)
    for local, candidates in by_local.items():
        approved = [
            candidate
            for candidate in candidates
            if candidate[0] in approved_names
            and re.fullmatch(module_pattern, candidate[1])
        ]
        if not approved:
            continue
        if len(candidates) != 1 or has_nonimport_binding(binding_code, local):
            continue
        trusted[local] = approved[0][0]
    return trusted

def approved_transport_forwarding_positions(source, code):
    """Return ``transport`` offsets passed to reviewed pagination helpers."""
    positions = set()
    helpers = trusted_named_imports(
        source,
        code,
        {"paginateCursor", "paginateOffset", "paginateSearch"},
        r"(?:\.\./)+core/pagination\.js",
    )
    if not helpers:
        return positions
    helper_pattern = "|".join(re.escape(name) for name in helpers)
    for call in re.finditer(
        r"(?<![A-Za-z0-9_$.])(?:" + helper_pattern + r")\b",
        code,
    ):
        cursor = call.end()
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if cursor < len(code) and code[cursor] == "<":
            cursor = match_type_arguments_end(code, cursor)
            if cursor == -1:
                continue
            while cursor < len(code) and code[cursor].isspace():
                cursor += 1
        if cursor >= len(code) or code[cursor] != "(":
            continue
        cursor += 1
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        transport = re.match(r"this\.transport\b", code[cursor:])
        if transport:
            positions.add(cursor + len("this."))
    return positions

def split_top_commas_aligned(source, code):
    """Split source on executable top-level commas using an aligned code view."""
    assert len(source) == len(code), "source/code views must stay aligned"
    parts = []
    start = 0
    depth = 0
    opens, closes = set("({["), set(")}]")
    for index, token in enumerate(code):
        if token in opens:
            depth += 1
        elif token in closes:
            depth -= 1
        elif token == "," and depth == 0:
            parts.append((source[start:index], code[start:index]))
            start = index + 1
    if source[start:].strip() or code[start:].strip():
        parts.append((source[start:], code[start:]))
    return parts

def lex_ts_source(source):
    """Return layout-preserving comment-masked and code-token-only views.

    Regex extraction must never treat a commented-out request as executable.
    Nor may request-like text inside a string or template-literal raw segment
    count as a call site. A small lexical state stack emits two same-length
    views: one retains literals for path resolution, while the other retains
    only executable code (including code inside ``${...}`` expressions).
    """
    chars = list(source)
    code_chars = list(source)
    stack = [{"mode": "code"}]
    i = 0

    def mask(buffer, start, end):
        for index in range(start, end):
            if buffer[index] not in {"\n", "\r"}:
                buffer[index] = " "

    def regex_can_start(index):
        """Conservative JavaScript regex-vs-division disambiguation.

        Resource/client regex literals overwhelmingly occur at expression
        starts. Previous code tokens are already literal/comment-masked, so
        punctuation and expression-leading keywords are sufficient here.
        """
        previous = index - 1
        while previous >= 0 and code_chars[previous].isspace():
            previous -= 1
        if previous < 0:
            return True
        if code_chars[previous] in "([{:;,=!?&|+-*%^~<>":
            return True
        if code_chars[previous] == "}":
            # A closed statement block is followed by statement lexical goal,
            # where a regex literal may begin. Treating a rare object-division
            # ambiguity as regex is deliberately fail-closed for route scans.
            return True
        if code_chars[previous] == ")":
            # A closing control-head parenthesis transitions to statement
            # lexical goal, where a regex literal may start an expression
            # statement: ``if (condition) /pattern/.test(value)``.
            depth = 0
            opener = previous
            while opener >= 0:
                if code_chars[opener] == ")":
                    depth += 1
                elif code_chars[opener] == "(":
                    depth -= 1
                    if depth == 0:
                        break
                opener -= 1
            keyword_end = opener
            while keyword_end > 0 and code_chars[keyword_end - 1].isspace():
                keyword_end -= 1
            keyword_start = keyword_end
            while (
                keyword_start > 0
                and (
                    code_chars[keyword_start - 1].isalnum()
                    or code_chars[keyword_start - 1] in "_$"
                )
            ):
                keyword_start -= 1
            if "".join(code_chars[keyword_start:keyword_end]) in {
                "for", "if", "while", "with",
            }:
                return True
            if "".join(code_chars[keyword_start:keyword_end]) == "await":
                previous_end = keyword_start
                while previous_end > 0 and code_chars[previous_end - 1].isspace():
                    previous_end -= 1
                previous_start = previous_end
                while (
                    previous_start > 0
                    and (
                        code_chars[previous_start - 1].isalnum()
                        or code_chars[previous_start - 1] in "_$"
                    )
                ):
                    previous_start -= 1
                if "".join(code_chars[previous_start:previous_end]) == "for":
                    return True
        end = previous + 1
        while previous >= 0 and (code_chars[previous].isalnum() or code_chars[previous] in "_$"):
            previous -= 1
        keyword = "".join(code_chars[previous + 1:end])
        return keyword in {
            "await", "break", "case", "continue", "debugger", "delete", "do",
            "else", "in", "instanceof", "of", "return", "throw", "typeof",
            "void", "yield",
        }

    while i < len(source):
        frame = stack[-1]
        mode = frame["mode"]

        if mode in {"single", "double"}:
            quote = "'" if mode == "single" else '"'
            if source[i] == "\\" and i + 1 < len(source):
                mask(code_chars, i, i + 2)
                i += 2
            elif source[i] == quote:
                mask(code_chars, i, i + 1)
                stack.pop()
                i += 1
            else:
                mask(code_chars, i, i + 1)
                i += 1
            continue

        if mode == "template":
            if source[i] == "\\" and i + 1 < len(source):
                mask(code_chars, i, i + 2)
                i += 2
            elif source[i] == "`":
                mask(code_chars, i, i + 1)
                stack.pop()
                i += 1
            elif source.startswith("${", i):
                # Mask only `$`; retain the balanced interpolation braces and
                # executable expression so structural scans keep their depth.
                mask(code_chars, i, i + 1)
                stack.append({"mode": "template-expression", "depth": 1})
                i += 2
            else:
                mask(code_chars, i, i + 1)
                i += 1
            continue

        if mode == "regex":
            if source[i] == "\\" and i + 1 < len(source):
                mask(code_chars, i, i + 2)
                i += 2
            elif source[i] == "[":
                frame["in_class"] = True
                mask(code_chars, i, i + 1)
                i += 1
            elif source[i] == "]" and frame["in_class"]:
                frame["in_class"] = False
                mask(code_chars, i, i + 1)
                i += 1
            elif source[i] == "/" and not frame["in_class"]:
                mask(code_chars, i, i + 1)
                i += 1
                while i < len(source) and source[i].isalpha():
                    mask(code_chars, i, i + 1)
                    i += 1
                stack.pop()
            else:
                mask(code_chars, i, i + 1)
                i += 1
            continue

        # Normal code and `${...}` template expressions share lexical rules.
        if source.startswith("//", i):
            end = source.find("\n", i + 2)
            if end == -1:
                end = len(source)
            mask(chars, i, end)
            mask(code_chars, i, end)
            i = end
            continue
        if source.startswith("/*", i):
            close = source.find("*/", i + 2)
            end = len(source) if close == -1 else close + 2
            mask(chars, i, end)
            mask(code_chars, i, end)
            i = end
            continue
        if source[i] == "/" and regex_can_start(i):
            mask(code_chars, i, i + 1)
            stack.append({"mode": "regex", "in_class": False})
            i += 1
            continue
        if source[i] == "'":
            mask(code_chars, i, i + 1)
            stack.append({"mode": "single"})
            i += 1
            continue
        if source[i] == '"':
            mask(code_chars, i, i + 1)
            stack.append({"mode": "double"})
            i += 1
            continue
        if source[i] == "`":
            mask(code_chars, i, i + 1)
            stack.append({"mode": "template"})
            i += 1
            continue
        if mode == "template-expression":
            if source[i] == "{":
                frame["depth"] += 1
            elif source[i] == "}":
                frame["depth"] -= 1
                if frame["depth"] == 0:
                    stack.pop()
            i += 1
            continue
        i += 1

    comment_masked = "".join(chars)
    code_only = "".join(code_chars)
    assert len(source) == len(comment_masked) == len(code_only)
    return comment_masked, code_only

def parse_object_literal(arg, arg_code, varmap):
    assert len(arg) == len(arg_code), "source/code views must stay aligned"
    out = {}
    body_start = arg_code.index("{") + 1
    body_end = arg_code.rindex("}")
    for _, field_code in split_top_commas_aligned(
        arg[body_start:body_end],
        arg_code[body_start:body_end],
    ):
        m = re.match(r"\s*([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)", field_code)
        if m and m.group(2) in varmap: out[m.group(1)] = varmap[m.group(2)]
    return out

def parse_base_suffixes(client_src, client_code):
    """Derive resource base-path suffixes from the runtime client wiring.

    Only initializers rooted in ``resolved.baseUrl`` (or aliases that resolve
    uniquely to one such initializer) are accepted. This is deliberately
    fail-closed: an initializer that cannot be proved to have one tenant-route
    suffix stays unresolved instead of silently falling back to a previously
    known Atlassian prefix.
    """
    assert len(client_src) == len(client_code), "source/code views must stay aligned"
    initializers = {}
    ambiguous = set()
    for m in re.finditer(
        r"\bconst\s+((?:baseUrl)|(?:[A-Za-z0-9_]+BaseUrl))\s*(?::[^=]+)?=",
        client_code,
    ):
        name = m.group(1)
        if name in initializers or name in ambiguous:
            # A flattened regex cannot prove which same-named lexical binding
            # reaches later resource wiring. Omit the alias so extraction fails
            # closed instead of selecting a nested/dead shadow.
            initializers.pop(name, None)
            ambiguous.add(name)
            continue
        start = m.end()
        while start < len(client_src) and client_src[start].isspace():
            start += 1
        end = client_code.find(";", start)
        if end != -1:
            initializers[name] = (
                client_src[start:end],
                client_code[start:end],
            )

    for name in list(initializers):
        target = re.escape(name)
        destructured = re.search(
            r"(?:\{[^{};]*\b" + target + r"\b[^{};]*\}"
            r"|\[[^\[\];]*\b" + target + r"\b[^\[\];]*\])\s*=",
            client_code,
        )
        direct_writes = len(re.findall(
            r"\b" + target + r"\s*(?::[^=;\n]+)?\s*=(?!=|>)",
            client_code,
        ))
        simple_declarations = len(re.findall(
            r"\b(?:const|let|var)\s+" + target + r"\b",
            client_code,
        ))
        parameter_shadow = any((
            re.search(
                r"\([^()]*\b" + target + r"\b[^()]*\)\s*"
                r"(?::[^=;{}]+)?=>",
                client_code,
            ),
            re.search(
                r"\bfunction\b[^()]*\([^)]*\b" + target + r"\b[^)]*\)",
                client_code,
            ),
            re.search(
                r"\bcatch\s*\([^)]*\b" + target + r"\b[^)]*\)",
                client_code,
            ),
            re.search(
                r"(?:^|[{};])\s*(?:(?:public|protected|private|static|async)\s+)*"
                r"[A-Za-z_$][A-Za-z0-9_$]*\s*\([^)]*\b" + target
                + r"\b[^)]*\)\s*(?::[^{}]+)?\{",
                client_code,
                re.MULTILINE,
            ),
            re.search(
                r"\b" + target + r"\b\s*(?::[^=,;()]+)?=>",
                client_code,
            ),
        ))
        if (
            destructured
            or direct_writes != 1
            or simple_declarations != 1
            or parameter_shadow
        ):
            initializers.pop(name, None)
            ambiguous.add(name)

    resolved = {}

    def resolved_suffixes(expr, expr_code):
        """Resolve only route-preserving tenant-base branches of an initializer."""
        assert len(expr) == len(expr_code)
        leading = len(expr) - len(expr.lstrip())
        trailing = len(expr.rstrip())
        expr = expr[leading:trailing]
        expr_code = expr_code[leading:trailing]
        if expr_code.startswith("(") and match_close(
            expr_code, 0, "(", ")"
        ) == len(expr_code):
            return resolved_suffixes(expr[1:-1], expr_code[1:-1])
        ternary = top_level_ternary(expr_code)
        if ternary:
            true_result = resolved_suffixes(
                expr[ternary[0] + 1:ternary[1]],
                expr_code[ternary[0] + 1:ternary[1]],
            )
            false_result = resolved_suffixes(
                expr[ternary[1] + 1:],
                expr_code[ternary[1] + 1:],
            )
            if true_result is None or false_result is None:
                return None
            return true_result | false_result

        matches = list(executable_template_matches(expr, expr_code))
        if matches:
            if not direct_template_usage_is_safe(expr, expr_code, matches):
                return None
            return {
                match.group(1)[len("${resolved.baseUrl}"):]
                for match in matches
                if match.group(1).startswith("${resolved.baseUrl}")
            }

        stripped = strip_enclosing_parens(expr_code)
        if stripped in resolved:
            return {resolved[stripped]}
        if re.fullmatch(r"(?:null|undefined)", stripped):
            return set()
        return set()

    pending = dict(initializers)
    while pending:
        progressed = False
        for name, (expr, expr_code) in list(pending.items()):
            candidates = resolved_suffixes(expr, expr_code)
            if candidates is not None and len(candidates) == 1:
                resolved[name] = candidates.pop()
                del pending[name]
                progressed = True
        if not progressed:
            break
    return resolved

def parse_wiring(client_src, client_code, varmap):
    assert len(client_src) == len(client_code), "source/code views must stay aligned"
    wiring = {}
    constructor_match = re.search(r"\bconstructor\s*\(", client_code)
    constructor_body_start = -1
    constructor_body_end = -1
    constructor_scope = ()
    if constructor_match:
        params_start = client_code.index("(", constructor_match.start())
        params_end = match_close(client_code, params_start, "(", ")")
        if params_end != -1:
            constructor_body_start = client_code.find("{", params_end)
            if constructor_body_start != -1:
                constructor_body_end = match_close(
                    client_code, constructor_body_start, "{", "}"
                )
                constructor_scope = brace_scope_at(
                    client_code, constructor_body_start + 1
                )

    def is_plain_constructor_assignment(position):
        if (
            constructor_body_start == -1
            or constructor_body_end == -1
            or not constructor_body_start < position < constructor_body_end
            or brace_scope_at(client_code, position) != constructor_scope
        ):
            return False
        statement_start = max(
            constructor_body_start + 1,
            client_code.rfind(";", constructor_body_start, position) + 1,
            client_code.rfind("}", constructor_body_start, position) + 1,
        )
        return not client_code[statement_start:position].strip()

    resource_properties = {}
    unsupported_declaration_resources = set()
    for declaration in re.finditer(
        r"^[ \t]*(?:(?:public|protected|private)\s+)?(?:readonly\s+)?"
        r"([A-Za-z_$][A-Za-z0-9_$]*)\s*([!?]?)\s*:\s*([^;]+);",
        client_code,
        re.MULTILINE,
    ):
        property_name = declaration.group(1)
        marker = declaration.group(2)
        type_expression = declaration.group(3).strip()
        resources = set(re.findall(
            r"\b[A-Z][A-Za-z0-9]*Resource\b", type_expression
        ))
        if not resources:
            continue
        resource_properties.setdefault(property_name, set()).update(resources)
        if (
            marker == "?"
            or len(resources) != 1
            or type_expression != next(iter(resources))
        ):
            unsupported_declaration_resources.update(resources)
    for resource in unsupported_declaration_resources:
        wiring[resource] = [("UNKNOWN", "unsupported-resource-property-type")]
    recognized_property_assignments = []
    recognized_constructor_spans = []
    for assignment in re.finditer(
        r"\bthis\.([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=|>)",
        client_code,
    ):
        if (
            statically_dead_at(client_code, assignment.start(), client_src)
            or not is_plain_constructor_assignment(assignment.start())
        ):
            continue
        statement_end = find_statement_end(client_code, assignment.end())
        if statement_end == -1:
            continue
        rhs_code = client_code[assignment.end():statement_end]
        rhs_src = client_src[assignment.end():statement_end]
        constructors = set(re.findall(
            r"\bnew\s+([A-Z][A-Za-z0-9]*Resource)\s*\(", rhs_code
        ))
        if not constructors:
            continue
        direct = re.match(
            r"\s*new\s+([A-Z][A-Za-z0-9]*Resource)\s*\(", rhs_code
        )
        if not direct:
            for resource in constructors:
                wiring[resource] = [("UNKNOWN", "unsupported-resource-wiring")]
            continue
        op = rhs_code.index("(", direct.end() - 1)
        end = match_close(rhs_code, op, "(", ")")
        if end == -1 or rhs_code[end:].strip():
            for resource in constructors:
                wiring[resource] = [("UNKNOWN", "unsupported-resource-wiring")]
            continue
        property_name = assignment.group(1)
        resource = direct.group(1)
        declared_resources = resource_properties.get(property_name, set())
        if declared_resources and declared_resources != {resource}:
            for declared_resource in declared_resources:
                wiring[declared_resource] = [
                    ("UNKNOWN", "resource-property-type-mismatch")
                ]
            wiring[resource] = [("UNKNOWN", "resource-property-type-mismatch")]
            continue
        resource_properties.setdefault(property_name, set()).add(resource)
        recognized_property_assignments.append(
            (assignment.start(), property_name, resource)
        )
        recognized_constructor_spans.append(
            (assignment.end(), statement_end, resource)
        )
        args = split_top_commas_aligned(
            rhs_src[op+1:end-1],
            rhs_code[op+1:end-1],
        )
        base_args = []
        for arg_src, arg_code in args[1:]:
            code_value = arg_code.strip()
            if code_value in varmap:
                base_args.append(varmap[code_value])
            elif code_value.startswith("{"):
                base_args.append(parse_object_literal(arg_src, arg_code, varmap))
            else:
                base_args.append(("UNKNOWN", arg_src.strip()))
        wiring[resource] = (
            [("UNKNOWN", "duplicate-resource-wiring")]
            if resource in wiring else base_args
        )
    for constructor in re.finditer(
        r"\bnew\s+([A-Z][A-Za-z0-9]*Resource)\s*\(", client_code
    ):
        if statically_dead_at(client_code, constructor.start(), client_src):
            continue
        resource = constructor.group(1)
        if not any(
            start <= constructor.start() < end and recognized_resource == resource
            for start, end, recognized_resource in recognized_constructor_spans
        ):
            wiring[resource] = [("UNKNOWN", "unsupported-resource-construction")]
    assignment_counts = {}
    recognized_this_uses = set()
    for position, property_name, resource in recognized_property_assignments:
        assignment_counts[property_name] = assignment_counts.get(property_name, 0) + 1
        recognized_this_uses.add(position)
    for property_name, resources in resource_properties.items():
        if assignment_counts.get(property_name) != 1:
            for resource in resources:
                wiring[resource] = [
                    ("UNKNOWN", "unsupported-resource-property-wiring")
                ]
    for this_use in re.finditer(r"\bthis\b", client_code):
        if this_use.start() in recognized_this_uses:
            continue
        property_access = re.match(
            r"\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)",
            client_code[this_use.end():],
        )
        if property_access:
            resources = resource_properties.get(property_access.group(1), set())
            for resource in resources:
                wiring[resource] = [
                    ("UNKNOWN", "unsupported-resource-property-use")
                ]
            continue
        all_resources = set(wiring)
        for resources in resource_properties.values():
            all_resources.update(resources)
        for resource in all_resources:
            wiring[resource] = [("UNKNOWN", "unsupported-client-instance-use")]
    if re.search(r"\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]+\})", client_code):
        all_resources = set(wiring)
        for resources in resource_properties.values():
            all_resources.update(resources)
        for resource in all_resources:
            wiring[resource] = [("UNKNOWN", "unsupported-escaped-identifier")]
    return wiring

def parse_ctor_params(src, code_src):
    assert len(src) == len(code_src), "source/code views must stay aligned"
    m = re.search(r"constructor\s*\(", code_src)
    if not m: return []
    op = code_src.index("(", m.end()-1)
    end = match_close(code_src, op, "(", ")")
    names = []
    for _, param_code in split_top_commas_aligned(
        src[op+1:end-1],
        code_src[op+1:end-1],
    ):
        pm = re.search(r"([A-Za-z0-9_]+)\s*[?:]", param_code)
        if pm: names.append(pm.group(1))
    return names[1:] if names else []

def norm(path_tmpl):
    """Normalize only route syntax that is equivalent at request time.

    A URL's doubled and trailing slashes are preserved by the transport and may
    address a different route, so they must remain significant in the coverage
    comparison.
    """
    path_tmpl = path_tmpl.split("?")[0]
    s = re.sub(r"\$\{[^}]*\}", "{}", path_tmpl)
    s = re.sub(r"\{[^}]*\}", "{}", s)
    return s

def route_template_key(tpl):
    """Identity used to prove several templates address the same route."""
    base = re.match(r"\$\{([^}]*)\}", tpl)
    return (base.group(1) if base else None, norm(tpl))

def route_templates_agree(candidates):
    return bool(candidates) and len({route_template_key(tpl) for tpl in candidates}) == 1

def executable_template_matches(expr, expr_code):
    """Yield executable route templates, excluding backticks in other literals."""
    assert len(expr) == len(expr_code), "source/code views must stay aligned"
    for match in re.finditer(r"`([^`]*)`", expr):
        # Route templates begin with an interpolation. Executable code inside
        # `${...}` survives in the code-only view, whereas a backtick sequence
        # embedded in a quoted/regex/template-raw example is fully masked.
        if expr_code[match.start():match.end()].strip():
            yield match

def first_template(expr, expr_code=None):
    """First executable backtick route template in expr, or None."""
    code = lex_ts_source(expr)[1] if expr_code is None else expr_code
    return next((match.group(1) for match in executable_template_matches(expr, code)), None)

def find_statement_end(code, start):
    """Return the next top-level semicolon in a code-token-only view."""
    depth = {"(": 0, "{": 0, "[": 0}
    pairs = {")": "(", "}": "{", "]": "["}
    for index in range(start, len(code)):
        token = code[index]
        if token in depth:
            depth[token] += 1
        elif token in pairs:
            opener = pairs[token]
            if depth[opener] > 0:
                depth[opener] -= 1
        elif token == ";" and all(level == 0 for level in depth.values()):
            return index
    return -1

@functools.lru_cache(maxsize=None)
def brace_intervals(code):
    """Return executable brace intervals as ``(open, close)`` pairs."""
    intervals = []
    stack = []
    for index, token in enumerate(code):
        if token == "{":
            stack.append(index)
        elif token == "}" and stack:
            intervals.append((stack.pop(), index))
    intervals.extend((start, len(code)) for start in stack)
    return tuple(sorted(intervals))

@functools.lru_cache(maxsize=None)
def brace_scope_at(code, position):
    """Return the still-open executable brace scopes at ``position``."""
    return tuple(
        start
        for start, end in brace_intervals(code)
        if start < position <= end
    )

@functools.lru_cache(maxsize=None)
def brace_parent_map(code):
    """Map each executable opening brace to its immediately enclosing brace."""
    parents = {}
    stack = []
    for index, token in enumerate(code):
        if token == "{":
            parents[index] = stack[-1] if stack else None
            stack.append(index)
        elif token == "}" and stack:
            stack.pop()
    return parents

def visible_assignments(assignments, local_code):
    """Select the closest lexical binding visible at the context endpoint."""
    use_scope = brace_scope_at(local_code, len(local_code))
    visible = []
    for assignment in assignments:
        declaration_scope = brace_scope_at(local_code, assignment[0])
        if use_scope[:len(declaration_scope)] == declaration_scope:
            visible.append((len(declaration_scope), *assignment))
    if not visible:
        return []
    deepest = max(item[0] for item in visible)
    closest = max(
        (item for item in visible if item[0] == deepest),
        key=lambda item: item[1],
    )
    return [closest[1:]]

def parameter_list_binds_name(params_code, name):
    """Whether a TypeScript parameter list declares ``name`` as a value."""
    target = re.escape(name)
    for _, parameter in split_top_commas_aligned(params_code, params_code):
        stripped = parameter.strip()
        direct = re.match(
            r"(?:(?:private|protected|public|readonly|override)\s+)*"
            r"(?:\.\.\.\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\b",
            stripped,
        )
        if direct:
            if direct.group(1) == name:
                return True
            continue
        if stripped.startswith(("{", "[")) and re.search(
            r"\b" + target + r"\b", stripped
        ):
            # Destructuring aliases/defaults require a full binding parser to
            # distinguish keys from targets. Treat any occurrence as a shadow
            # rather than borrowing an outer constant through the pattern.
            return True
    return False

def has_visible_shadowing_binding_after(
    code, name, binding_position, use_position
):
    """Reject a nearer lexical/value binding before resolving an outer const."""
    target = re.escape(name)
    use_scope = brace_scope_at(code, use_position)

    def binding_scope_is_visible(position):
        declaration_scope = brace_scope_at(code, position)
        return use_scope[:len(declaration_scope)] == declaration_scope

    # Method, object-method, and named-function parameters are scoped to their
    # callable body even though their textual declaration precedes its brace.
    for (
        params_start,
        params_end,
        body_start,
        body_end,
        *_rest,
    ) in method_declaration_spans(code):
        if (
            binding_position < params_start < use_position
            and body_start < use_position < body_end
            and parameter_list_binds_name(
                code[params_start:params_end], name
            )
        ):
            return True

    search_start = binding_position + 1
    local_code = code[search_start:use_position]
    for declaration in re.finditer(r"\b(?:const|let|var)\b", local_code):
        position = search_start + declaration.start()
        if not binding_scope_is_visible(position):
            continue
        cursor = search_start + declaration.end()
        while cursor < use_position and code[cursor].isspace():
            cursor += 1
        direct = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", code[cursor:use_position])
        if direct and direct.group(0) == name:
            return True
        if cursor < use_position and code[cursor] in "{[":
            close_token = "}" if code[cursor] == "{" else "]"
            binding_end = match_close(
                code[:use_position], cursor, code[cursor], close_token
            )
            if (
                binding_end != -1
                and re.search(r"\b" + target + r"\b", code[cursor:binding_end])
            ):
                return True

    for declaration in re.finditer(
        r"\b(?:function|class|enum|namespace)\s+" + target + r"\b",
        local_code,
    ):
        if binding_scope_is_visible(search_start + declaration.start()):
            return True

    for catch in re.finditer(r"\bcatch\s*\(", local_code):
        catch_start = search_start + catch.start()
        params_open = code.index("(", catch_start, search_start + catch.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1 or params_end > use_position:
            continue
        body_start = params_end
        while body_start < len(code) and code[body_start].isspace():
            body_start += 1
        body_end = (
            match_close(code, body_start, "{", "}")
            if body_start < len(code) and code[body_start] == "{"
            else -1
        )
        if (
            body_end != -1
            and body_start < use_position < body_end
            and re.search(
                r"\b" + target + r"\b",
                code[params_open + 1:params_end - 1],
            )
        ):
            return True
    return False

def has_destructuring_write(code, ident, start=0):
    """Detect an assignment target that can rewrite ``ident`` indirectly."""
    target = re.escape(ident)
    assignment = re.compile(
        r"(?:\[[^\]\n;]*\b" + target + r"\b[^\]\n;]*\]"
        r"|\{[^}\n;]*\b" + target + r"\b[^}\n;]*\})\s*=(?!=|>)"
    )
    for write in assignment.finditer(code, start):
        prefix = code[max(0, write.start() - 24):write.start()]
        if re.search(r"\b(?:const|let|var)\s*$", prefix):
            continue
        return True
    return False

def strip_enclosing_parens(code):
    """Remove grouping parentheses that enclose the complete expression."""
    stripped = code.strip()
    while stripped.startswith("("):
        close = match_close(stripped, 0, "(", ")")
        if close != len(stripped):
            break
        stripped = stripped[1:-1].strip()
    return stripped

def has_top_level_choice(code):
    """Whether a path expression can select/compose more than one route."""
    code = strip_enclosing_parens(code)
    depth = {"(": 0, "{": 0, "[": 0}
    pairs = {")": "(", "}": "{", "]": "["}
    for index, token in enumerate(code):
        if token in depth:
            depth[token] += 1
            continue
        if token in pairs:
            opener = pairs[token]
            if depth[opener] > 0:
                depth[opener] -= 1
            continue
        if any(depth.values()):
            continue
        if token in {"+", ","}:
            return True
        if token == "?" and (index + 1 >= len(code) or code[index + 1] != "."):
            return True
        if code.startswith("&&", index) or code.startswith("||", index):
            return True
    return False

def top_level_ternary(code):
    """Return the question/colon offsets for a top-level ternary expression."""
    depth = {"(": 0, "{": 0, "[": 0}
    pairs = {")": "(", "}": "{", "]": "["}
    question = None
    nested = 0
    for index, token in enumerate(code):
        if token in depth:
            depth[token] += 1
            continue
        if token in pairs:
            opener = pairs[token]
            if depth[opener] > 0:
                depth[opener] -= 1
            continue
        if any(depth.values()):
            continue
        if token == "?" and (index + 1 >= len(code) or code[index + 1] != "."):
            if question is None:
                question = index
            else:
                nested += 1
        elif token == ":" and question is not None:
            if nested == 0:
                return question, index
            nested -= 1
    return None

def direct_template_usage_is_safe(
    expr,
    expr_code,
    matches,
    definitions=None,
    definitions_code=None,
    helper_stack=None,
):
    """Prove route templates are not transformed before transport use."""
    assert len(expr) == len(expr_code), "source/code views must stay aligned"
    leading = len(expr) - len(expr.lstrip())
    trailing = len(expr.rstrip())
    expr = expr[leading:trailing]
    expr_code = expr_code[leading:trailing]
    if expr_code.startswith("(") and match_close(
        expr_code, 0, "(", ")"
    ) == len(expr_code):
        inner_expr = expr[1:-1]
        inner_code = expr_code[1:-1]
        return direct_template_usage_is_safe(
            inner_expr,
            inner_code,
            executable_template_matches(inner_expr, inner_code),
            definitions,
            definitions_code,
            helper_stack,
        )

    matches = list(executable_template_matches(expr, expr_code))
    if not matches:
        return False
    skeleton_parts = []
    previous = 0
    for match in matches:
        skeleton_parts.append(expr_code[previous:match.start()])
        skeleton_parts.append(" __ROUTE__ ")
        previous = match.end()
    skeleton_parts.append(expr_code[previous:])
    skeleton = "".join(skeleton_parts).strip()

    if re.fullmatch(r"__ROUTE__(?:\s+as\s+(?:const|string))?", skeleton):
        return True
    ternary = top_level_ternary(expr_code)
    if ternary:
        true_expr = expr[ternary[0] + 1:ternary[1]]
        true_code = expr_code[ternary[0] + 1:ternary[1]]
        false_expr = expr[ternary[1] + 1:]
        false_code = expr_code[ternary[1] + 1:]
        true_matches = list(executable_template_matches(true_expr, true_code))
        false_matches = list(executable_template_matches(false_expr, false_code))
        branch_candidates = {
            match.group(1) for match in true_matches + false_matches
        }
        return bool(
            true_matches
            and false_matches
            and len(true_matches) + len(false_matches) == len(matches)
            and route_templates_agree(branch_candidates)
            and direct_template_usage_is_safe(
                true_expr,
                true_code,
                true_matches,
                definitions,
                definitions_code,
                helper_stack,
            )
            and direct_template_usage_is_safe(
                false_expr,
                false_code,
                false_matches,
                definitions,
                definitions_code,
                helper_stack,
            )
        )
    if has_top_level_choice(expr_code) or re.search(
        r"__ROUTE__\s*(?:\?\.|\.|\[)", skeleton
    ):
        return False

    wrapper = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*\(", expr_code)
    if not wrapper:
        return False
    wrapper_name = wrapper.group(1)
    if (
        not route_primitive_is_trusted(
            definitions,
            definitions_code,
            wrapper_name,
        )
        and not helper_preserves_first_parameter(
            definitions,
            definitions_code,
            wrapper_name,
            helper_stack,
        )
    ):
        return False
    open_paren = expr_code.index("(", wrapper.start())
    close = match_close(expr_code, open_paren, "(", ")")
    if close != len(expr_code):
        return False
    args = split_top_commas_aligned(
        expr[open_paren + 1:close - 1],
        expr_code[open_paren + 1:close - 1],
    )
    if not args:
        return False
    first_matches = list(executable_template_matches(args[0][0], args[0][1]))
    return bool(
        first_matches
        and len(first_matches) == len(matches)
        and direct_template_usage_is_safe(
            args[0][0],
            args[0][1],
            first_matches,
            definitions,
            definitions_code,
            helper_stack,
        )
    )

def simple_identifier_expression(code):
    """Whether an identifier-backed path is used without transforms."""
    return bool(re.fullmatch(
        r"[A-Za-z_][A-Za-z0-9_]*(?:\s+as\s+(?:const|string))?",
        strip_enclosing_parens(code),
    ))

def route_wrapper_first_identifier(
    code, definitions=None, definitions_code=None, helper_stack=None
):
    """Return a reviewed route wrapper's first identifier argument."""
    stripped = strip_enclosing_parens(code)
    wrapper = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*\(", stripped)
    if not wrapper:
        return None
    wrapper_name = wrapper.group(1)
    if (
        not route_primitive_is_trusted(
            definitions,
            definitions_code,
            wrapper_name,
        )
        and not helper_preserves_first_parameter(
            definitions,
            definitions_code,
            wrapper_name,
            helper_stack,
        )
    ):
        return None
    open_paren = stripped.index("(", wrapper.start())
    close = match_close(stripped, open_paren, "(", ")")
    if close != len(stripped):
        return None
    args_code = stripped[open_paren + 1:close - 1]
    args = split_top_commas_aligned(args_code, args_code)
    if not args:
        return None
    first = args[0][1].strip()
    return first if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", first) else None

def self_assignment_is_route_preserving(
    ident, rhs, rhs_code, definitions=None, definitions_code=None
):
    """Recognize reviewed query-only mutations of an existing route."""
    stripped = strip_enclosing_parens(rhs_code)
    if route_wrapper_first_identifier(
        stripped, definitions, definitions_code
    ) == ident:
        return True
    templates = list(executable_template_matches(rhs, rhs_code))
    return bool(
        len(templates) == 1
        and templates[0].group(1).startswith("${" + ident + "}?")
        and direct_template_usage_is_safe(
            rhs, rhs_code, templates, definitions, definitions_code
        )
    )

def unconditional_exit_before_at(code, position):
    """Whether the current lexical block exits before ``position``."""
    use_scope = brace_scope_at(code, position)
    scope_start = use_scope[-1] + 1 if use_scope else 0
    statement_start = scope_start
    for exit_token in re.finditer(
        r"\b(?:break|continue|return|throw)\b",
        code[scope_start:position],
    ):
        token_start = scope_start + exit_token.start()
        if brace_scope_at(code, token_start) != use_scope:
            continue
        exit_end = find_statement_end(
            code, scope_start + exit_token.end()
        )
        if exit_end == -1 or exit_end >= position:
            continue
        for index in range(statement_start, token_start):
            if code[index] == ";" and brace_scope_at(code, index) == use_scope:
                statement_start = index + 1
            elif code[index] == "}" and brace_scope_at(code, index + 1) == use_scope:
                statement_start = index + 1
        controller = code[statement_start:token_start]
        if not re.search(
            r"\b(?:case|default|do|else|for|if|switch|while|with)\b",
            controller,
        ):
            return True
    return False

def standalone_keyword_at(code, position):
    """Reject property/optional-member tokens that resemble control keywords."""
    previous = position - 1
    while previous >= 0 and code[previous].isspace():
        previous -= 1
    return previous < 0 or code[previous] not in ".?"

def statically_constant_value(
    source,
    code,
    expression_source,
    expression_code,
    use_position,
    seen=None,
):
    """Resolve a deliberately small subset of immutable scalar expressions."""
    assert len(source) == len(code), "source/code views must stay aligned"
    assert len(expression_source) == len(expression_code)
    leading = len(expression_source) - len(expression_source.lstrip())
    trailing = len(expression_source.rstrip())
    expression_source = expression_source[leading:trailing]
    expression_code = expression_code[leading:trailing]
    as_const = re.search(r"\bas\s+const\s*$", expression_code)
    if as_const:
        expression_source = expression_source[:as_const.start()].rstrip()
        expression_code = expression_code[:as_const.start()].rstrip()
    while (
        expression_code.startswith("(")
        and match_close(expression_code, 0, "(", ")") == len(expression_code)
    ):
        expression_source = expression_source[1:-1].strip()
        expression_code = expression_code[1:-1].strip()

    if expression_code in {"true", "false"}:
        return True, expression_code == "true"
    if expression_code == "null":
        return True, STATIC_NULL
    if expression_code == "undefined":
        # Unlike null, undefined is a shadowable identifier in JavaScript.
        return False, None
    if re.fullmatch(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?", expression_code):
        return True, float(expression_code) if "." in expression_code else int(expression_code)
    if re.fullmatch(
        r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"",
        expression_source,
        re.S,
    ):
        if "\\" in expression_source:
            return False, None
        return True, expression_source[1:-1]

    negated = re.fullmatch(r"!\s*(.+)", expression_code, re.S)
    if negated:
        inner_start, inner_end = negated.span(1)
        known, value = statically_constant_value(
            source,
            code,
            expression_source[inner_start:inner_end],
            expression_code[inner_start:inner_end],
            use_position,
            seen,
        )
        truthy = False if value is STATIC_NULL else bool(value)
        return (True, not truthy) if known else (False, None)

    identifier = re.fullmatch(
        r"[A-Za-z_$][A-Za-z0-9_$]*",
        expression_code,
    )
    if not identifier:
        return False, None
    name = identifier.group(0)
    seen = set() if seen is None else set(seen)
    if name in seen:
        return False, None
    seen.add(name)

    local_code = code[:use_position]
    local_source = source[:use_position]
    declarations = []
    declaration = re.compile(
        r"\bconst\s+" + re.escape(name) + r"\s*(?::[^=;]+)?\s*="
    )
    for assignment in declaration.finditer(local_code):
        value_start = assignment.end()
        value_end = find_statement_end(local_code, value_start)
        if value_end != -1:
            declarations.append((
                assignment.start(),
                local_source[value_start:value_end],
                local_code[value_start:value_end],
            ))
    visible = visible_assignments(declarations, local_code)
    if not visible:
        return False, None
    binding_position, value_source, value_code = visible[0]
    if has_visible_shadowing_binding_after(
        code,
        name,
        binding_position,
        use_position,
    ):
        return False, None
    return statically_constant_value(
        source,
        code,
        value_source,
        value_code,
        binding_position,
        seen,
    )

def statically_boolean_value(
    source,
    code,
    expression_source,
    expression_code,
    use_position,
):
    """Resolve an immutable scalar expression using JavaScript truthiness."""
    known, value = statically_constant_value(
        source,
        code,
        expression_source,
        expression_code,
        use_position,
    )
    if not known:
        return None
    return False if value is STATIC_NULL else bool(value)

def prior_guaranteed_conditional_exit_at(code, position, source=None):
    """Whether a statically-true prior ``if`` guarantees an exit."""
    source = code if source is None else source
    use_scope = brace_scope_at(code, position)
    for controller in re.finditer(r"\bif\s*\(", code[:position]):
        if not standalone_keyword_at(code, controller.start()):
            continue
        if brace_scope_at(code, controller.start()) != use_scope:
            continue
        if conditional_control_at(code, controller.start()):
            continue
        params_open = code.index("(", controller.start(), controller.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1 or params_end > position:
            continue
        condition_start = params_open + 1
        condition_end = params_end - 1
        if statically_boolean_value(
            source,
            code,
            source[condition_start:condition_end],
            code[condition_start:condition_end],
            controller.start(),
        ) is not True:
            continue

        statement_start = params_end
        while statement_start < len(code) and code[statement_start].isspace():
            statement_start += 1
        if statement_start >= len(code):
            continue
        if code[statement_start] == "{":
            statement_end = match_close(code, statement_start, "{", "}")
            if (
                statement_end != -1
                and statement_end <= position
                and re.match(
                    r"^\s*(?:(?:const|let|var)\b[^;]*;\s*)*(?:return|throw)\b",
                    code[statement_start + 1:statement_end - 1],
                    re.S,
                )
            ):
                return True
            continue

        statement_end = find_statement_end(code, statement_start)
        if statement_end == -1 or statement_end >= position:
            continue
        statement = code[statement_start:statement_end].strip()
        if re.match(r"^(?:return|throw)\b", statement):
            return True
    return False

def case_label_colon(code, start, end):
    """Return a switch-label colon outside nested expressions."""
    depth = {"(": 0, "{": 0, "[": 0}
    closing = {")": "(", "}": "{", "]": "["}
    for index in range(start, end):
        token = code[index]
        if token in depth:
            depth[token] += 1
        elif token in closing:
            opener = closing[token]
            if depth[opener]:
                depth[opener] -= 1
        elif token == ":" and not any(depth.values()):
            return index
    return -1

def prior_guaranteed_switch_exit_at(code, position, source=None):
    """Whether a constant prior switch arm immediately returns or throws."""
    source = code if source is None else source
    use_scope = brace_scope_at(code, position)
    for controller in re.finditer(r"\bswitch\s*\(", code[:position]):
        if not standalone_keyword_at(code, controller.start()):
            continue
        if brace_scope_at(code, controller.start()) != use_scope:
            continue
        if conditional_control_at(code, controller.start()):
            continue
        params_open = code.index("(", controller.start(), controller.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            continue
        body_start = params_end
        while body_start < len(code) and code[body_start].isspace():
            body_start += 1
        if body_start >= len(code) or code[body_start] != "{":
            continue
        body_end = match_close(code, body_start, "{", "}")
        if body_end == -1 or body_end > position:
            continue

        known, discriminant = statically_constant_value(
            source,
            code,
            source[params_open + 1:params_end - 1],
            code[params_open + 1:params_end - 1],
            controller.start(),
        )
        if not known:
            continue

        switch_scope = brace_scope_at(code, body_start + 1)
        labels = []
        for label in re.finditer(r"\b(?:case|default)\b", code[body_start + 1:body_end - 1]):
            label_start = body_start + 1 + label.start()
            if brace_scope_at(code, label_start) != switch_scope:
                continue
            colon = case_label_colon(code, label_start + len(label.group(0)), body_end - 1)
            if colon != -1:
                labels.append((label.group(0), label_start, colon))
        default_indices = [
            index
            for index, (kind, _, _) in enumerate(labels)
            if kind == "default"
        ]
        if len(default_indices) > 1:
            continue
        default_index = default_indices[0] if default_indices else None
        all_cases_known = True
        for index, (kind, label_start, colon) in enumerate(labels):
            if kind == "default":
                default_index = index
                continue
            label_value_start = label_start + len(kind)
            case_known, case_value = statically_constant_value(
                source,
                code,
                source[label_value_start:colon],
                code[label_value_start:colon],
                controller.start(),
            )
            if not case_known:
                all_cases_known = False
                break
            same_value = (
                isinstance(case_value, (int, float))
                and not isinstance(case_value, bool)
                and isinstance(discriminant, (int, float))
                and not isinstance(discriminant, bool)
                and case_value == discriminant
                or type(case_value) is type(discriminant)
                and case_value == discriminant
            )
            if not same_value:
                continue
            arm_end = labels[index + 1][1] if index + 1 < len(labels) else body_end - 1
            arm = code[colon + 1:arm_end]
            return bool(re.match(
                r"^\s*(?:(?:const|let|var)\b[^;]*;\s*)*(?:return|throw)\b",
                arm,
                re.S,
            ))
        if all_cases_known and default_index is not None:
            _, _, colon = labels[default_index]
            arm_end = (
                labels[default_index + 1][1]
                if default_index + 1 < len(labels)
                else body_end - 1
            )
            return bool(re.match(
                r"^\s*(?:(?:const|let|var)\b[^;]*;\s*)*(?:return|throw)\b",
                code[colon + 1:arm_end],
                re.S,
            ))
    return False

def prior_statically_infinite_loop_at(code, position, source=None):
    """Whether a prior same-scope while/for loop cannot complete normally."""
    source = code if source is None else source
    use_scope = brace_scope_at(code, position)
    for controller in re.finditer(r"\b(while|for)\s*\(", code[:position]):
        kind = controller.group(1)
        if not standalone_keyword_at(code, controller.start()):
            continue
        if brace_scope_at(code, controller.start()) != use_scope:
            continue
        if conditional_control_at(code, controller.start()):
            continue
        if kind == "while" and do_while_header_at(code, controller.start()):
            continue
        params_open = code.index("(", controller.start(), controller.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            continue

        if kind == "while":
            condition_start = params_open + 1
            condition_end = params_end - 1
        else:
            header = code[params_open + 1:params_end - 1]
            separators = []
            depth = {"(": 0, "{": 0, "[": 0}
            closing = {")": "(", "}": "{", "]": "["}
            for offset, token in enumerate(header):
                if token in depth:
                    depth[token] += 1
                elif token in closing:
                    opener = closing[token]
                    if depth[opener]:
                        depth[opener] -= 1
                elif token == ";" and not any(depth.values()):
                    separators.append(params_open + 1 + offset)
            if len(separators) != 2:
                continue
            condition_start = separators[0] + 1
            condition_end = separators[1]

        condition_code = code[condition_start:condition_end]
        condition_true = (
            not condition_code.strip()
            or statically_boolean_value(
                source,
                code,
                source[condition_start:condition_end],
                condition_code,
                controller.start(),
            ) is True
        )
        if not condition_true:
            continue

        body_start = params_end
        while body_start < len(code) and code[body_start].isspace():
            body_start += 1
        if body_start >= len(code):
            continue
        if code[body_start] == "{":
            body_end = match_close(code, body_start, "{", "}")
            body_code = code[body_start + 1:body_end - 1] if body_end != -1 else ""
        elif code[body_start] == ";":
            body_end = body_start + 1
            body_code = ""
        else:
            continue
        if (
            body_end != -1
            and body_end <= position
            and not re.search(r"\bbreak\b", body_code)
        ):
            return True
    return False

def statically_dead_at(code, position, source=None):
    """Identify calls in literal-false blocks or after a guaranteed exit."""
    use_scope = brace_scope_at(code, position)
    for brace in use_scope:
        if re.search(
            r"\b(?:if|while)\s*\(\s*(?:false|0|null)\s*\)\s*$",
            code[:brace],
        ):
            return True
        else_match = re.search(r"\belse\s*$", code[:brace])
        if else_match:
            previous = else_match.start() - 1
            while previous >= 0 and code[previous].isspace():
                previous -= 1
            if previous >= 0 and code[previous] == "}":
                if_open = match_open(code, previous, "{", "}")
                if if_open != -1 and re.search(
                    r"\bif\s*\(\s*(?:true|1)\s*\)\s*$",
                    code[:if_open],
                ):
                    return True
    return (
        unconditional_exit_before_at(code, position)
        or prior_guaranteed_conditional_exit_at(code, position, source)
        or prior_guaranteed_switch_exit_at(code, position, source)
        or prior_statically_infinite_loop_at(code, position, source)
    )

def do_while_header_at(code, while_position):
    """Whether ``while_position`` starts a trailing ``do...while`` test."""
    cursor = while_position - 1
    while cursor >= 0 and code[cursor].isspace():
        cursor -= 1
    if cursor >= 0 and code[cursor] == "}":
        body_start = match_open(code, cursor, "{", "}")
        return bool(
            body_start != -1
            and re.search(r"\bdo\s*$", code[:body_start])
        )
    if cursor >= 0 and code[cursor] == ";":
        scope = brace_scope_at(code, while_position)
        scope_start = scope[-1] + 1 if scope else 0
        return bool(re.search(
            r"\bdo\b[^{}]*;\s*$",
            code[scope_start:while_position],
            re.S,
        ))
    return False

def controlled_statement_end(code, start):
    """Return the end of one JavaScript statement, including control forms."""
    while start < len(code) and code[start].isspace():
        start += 1
    if start >= len(code):
        return -1
    if code[start] == "{":
        return match_close(code, start, "{", "}")

    control = re.match(r"(if|for|switch|while|with)\s*\(", code[start:])
    if control and standalone_keyword_at(code, start):
        params_open = code.index("(", start, start + control.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            return -1
        body_end = controlled_statement_end(code, params_end)
        if body_end == -1:
            return -1
        if control.group(1) != "if":
            return body_end
        cursor = body_end
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        else_match = re.match(r"else\b", code[cursor:])
        return (
            controlled_statement_end(code, cursor + else_match.end())
            if else_match
            else body_end
        )

    if re.match(r"do\b", code[start:]) and standalone_keyword_at(code, start):
        body_end = controlled_statement_end(code, start + 2)
        if body_end == -1:
            return -1
        trailer = re.match(r"\s*while\s*\(", code[body_end:])
        if not trailer:
            return -1
        params_open = code.index("(", body_end, body_end + trailer.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            return -1
        cursor = params_end
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        return cursor + 1 if cursor < len(code) and code[cursor] == ";" else params_end

    statement_end = find_statement_end(code, start)
    return statement_end + 1 if statement_end != -1 else -1

def conditional_control_at(code, position):
    """Return an enclosing conditional controller not proven unconditional.

    Coverage may only rely on a call whose enclosing control flow is certain
    to execute. Resource pagination uses explicit infinite loops, which are
    the only conditional-looking blocks accepted here.
    """
    for brace in brace_scope_at(code, position):
        cursor = brace - 1
        while cursor >= 0 and code[cursor].isspace():
            cursor -= 1
        if cursor >= 0 and code[cursor] == ")":
            params_open = match_open(code, cursor, "(", ")")
            if params_open != -1:
                keyword_end = params_open
                while keyword_end > 0 and code[keyword_end - 1].isspace():
                    keyword_end -= 1
                keyword_match = re.search(
                    r"([A-Za-z_$][A-Za-z0-9_$]*)$",
                    code[:keyword_end],
                )
                keyword = keyword_match.group(1) if keyword_match else None
                header = code[params_open + 1:cursor]
                if keyword in {"if", "while"}:
                    if header.strip() in {"true", "1"}:
                        continue
                    return keyword
                if keyword == "for":
                    if re.fullmatch(
                        r"\s*;\s*(?:true|1)?\s*;\s*",
                        header,
                    ):
                        continue
                    return keyword
                if keyword in {"catch", "switch", "with"}:
                    return keyword
        controller = re.search(r"\b(?:catch|else)\s*$", code[:brace])
        if controller:
            return controller.group(0).strip()
    for controller in re.finditer(r"\b(if|for|while)\s*\(", code[:position]):
        keyword = controller.group(1)
        if not standalone_keyword_at(code, controller.start()):
            continue
        params_open = code.index("(", controller.start(), controller.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            continue
        if (
            keyword == "while"
            and params_open < position < params_end
            and do_while_header_at(code, controller.start())
        ):
            return "do-while-test"
        if keyword == "for" and params_open < position < params_end:
            depth = {"(": 0, "{": 0, "[": 0}
            closing = {")": "(", "}": "{", "]": "["}
            separators = []
            for index in range(params_open + 1, params_end - 1):
                token = code[index]
                if token in depth:
                    depth[token] += 1
                elif token in closing:
                    opener = closing[token]
                    if depth[opener]:
                        depth[opener] -= 1
                elif token == ";" and not any(depth.values()):
                    separators.append(index)
            if len(separators) == 2 and position > separators[1]:
                return "for-update"
            continue
        if params_end > position:
            continue
        statement_start = params_end
        while statement_start < len(code) and code[statement_start].isspace():
            statement_start += 1
        if statement_start >= len(code) or code[statement_start] == "{":
            continue
        statement_end = controlled_statement_end(code, statement_start)
        if statement_end == -1 or not statement_start <= position < statement_end:
            continue
        header = code[params_open + 1:params_end - 1]
        if keyword in {"if", "while"} and header.strip() in {"true", "1"}:
            continue
        if keyword == "for" and re.fullmatch(
            r"\s*;\s*(?:true|1)?\s*;\s*",
            header,
        ):
            continue
        return keyword
    for controller in re.finditer(r"\belse\b", code[:position]):
        statement_start = controller.end()
        while statement_start < len(code) and code[statement_start].isspace():
            statement_start += 1
        if statement_start >= len(code) or code[statement_start] == "{":
            continue
        statement_end = controlled_statement_end(code, statement_start)
        if statement_end != -1 and statement_start <= position < statement_end:
            return "else"
    return None

def conditional_expression_at(code, position):
    """Return a short-circuit/ternary operator guarding the call at position."""
    delimiter_stack = []
    delimiter_pairs = {")": "(", "}": "{", "]": "["}
    for index, token in enumerate(code[:position]):
        if token in "({[":
            delimiter_stack.append((token, index))
        elif token in delimiter_pairs:
            if delimiter_stack and delimiter_stack[-1][0] == delimiter_pairs[token]:
                delimiter_stack.pop()
    grouping_ancestors = {
        index for token, index in delimiter_stack if token in "(["
    }

    paren = bracket = brace = 0
    start = 0
    for index in range(position - 1, -1, -1):
        token = code[index]
        if token == ")":
            paren += 1
        elif token == "(":
            if paren:
                paren -= 1
        elif token == "]":
            bracket += 1
        elif token == "[":
            if bracket:
                bracket -= 1
        elif token == "}":
            if paren == 0 and bracket == 0 and brace == 0:
                start = index + 1
                break
            brace += 1
        elif token == "{":
            if brace:
                brace -= 1
            elif paren == 0 and bracket == 0:
                start = index + 1
                break
        elif (
            token in {";", ","}
            and paren == 0
            and bracket == 0
            and brace == 0
            and not any(opener < index for opener in grouping_ancestors)
        ):
            start = index + 1
            break
    prefix = code[start:position]
    short_circuit = re.search(r"&&|\|\||\?\?", prefix)
    if short_circuit:
        return short_circuit.group(0)
    if "?." in prefix:
        return "?."
    if re.search(r"(?<![?.])\?(?![?.])", prefix):
        return "?:"
    return None

def destructuring_default_at(code, position):
    """Whether a call is inside an object/array binding default initializer."""
    openers = []
    stack = []
    pairs = {")": "(", "}": "{", "]": "["}
    for index, token in enumerate(code[:position]):
        if token in "({[":
            stack.append((token, index))
        elif token in pairs:
            if stack and stack[-1][0] == pairs[token]:
                stack.pop()
    openers.extend(
        (token, index)
        for token, index in reversed(stack)
        if token in "{["
    )

    for opener, start in openers:
        closer = "}" if opener == "{" else "]"
        end = match_close(code, start, opener, closer)
        if end == -1 or end <= position:
            continue
        cursor = end
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if (
            cursor >= len(code)
            or code[cursor] != "="
            or code[cursor:cursor + 2] in {"==", "=>"}
        ):
            continue

        depth = {"(": 0, "{": 0, "[": 0}
        closing = {")": "(", "}": "{", "]": "["}
        for index in range(start + 1, position):
            token = code[index]
            if token in depth:
                depth[token] += 1
            elif token in closing:
                nested_opener = closing[token]
                if depth[nested_opener]:
                    depth[nested_opener] -= 1
            elif (
                token == "="
                and not any(depth.values())
                and code[max(start + 1, index - 1):index + 1]
                    not in {"!=", "<=", ">=", "=="}
                and code[index:index + 2] not in {"=>", "=="}
            ):
                return opener
    return None

def expression_preserves_route_ident(
    expr,
    expr_code,
    safe_idents,
    definitions=None,
    definitions_code=None,
    helper_stack=None,
):
    """Prove an expression preserves one of the supplied symbolic routes."""
    stripped = strip_enclosing_parens(expr_code)
    if stripped in safe_idents:
        return True
    wrapper_ident = route_wrapper_first_identifier(
        stripped, definitions, definitions_code, helper_stack
    )
    if wrapper_ident in safe_idents:
        return True
    templates = list(executable_template_matches(expr, expr_code))
    return bool(
        len(templates) == 1
        and any(
            templates[0].group(1).startswith("${" + ident + "}?")
            for ident in safe_idents
        )
        and direct_template_usage_is_safe(
            expr,
            expr_code,
            templates,
            definitions,
            definitions_code,
            helper_stack,
        )
    )

def helper_declaration_match(definitions_code, name):
    """Find a module function or class method declaration by name."""
    function = re.search(
        r"(?m)^\s*(?:export\s+)?(?:async\s+)?function\s+"
        + re.escape(name)
        + r"\s*\(",
        definitions_code,
    )
    if function:
        return function
    return re.search(
        r"(?m)^\s*(?:(?:private|protected|public)\s+)?(?:static\s+)?"
        r"(?:async\s+)?"
        + re.escape(name)
        + r"\s*\(",
        definitions_code,
    )

@functools.lru_cache(maxsize=None)
def route_primitive_is_trusted(definitions, definitions_code, name):
    """Prove a primitive is the unshadowed binding from core/query.js."""
    if not definitions or not definitions_code:
        return False
    trusted = trusted_named_imports(
        definitions,
        definitions_code,
        ROUTE_PRESERVING_PRIMITIVES,
        r"(?:\.\./)+core/query\.js",
    )
    return name in trusted

def property_has_computed_name(prop_code):
    """Whether an object member has a computed key, including accessors."""
    return bool(re.match(r"\s*(?:(?:get|set|async)\s+)?\[", prop_code))

def helper_preserves_first_parameter(
    definitions, definitions_code, name, helper_stack=None
):
    """Prove every returned ``path`` preserves a helper's first parameter."""
    if not definitions or not definitions_code:
        return False
    helper_stack = frozenset() if helper_stack is None else frozenset(helper_stack)
    if name in helper_stack:
        return False
    helper_stack = helper_stack | {name}
    method = helper_declaration_match(definitions_code, name)
    if not method:
        return False
    params_open = definitions_code.index("(", method.start())
    params_end = match_close(definitions_code, params_open, "(", ")")
    if params_end == -1:
        return False
    params = split_top_commas_aligned(
        definitions[params_open + 1:params_end - 1],
        definitions_code[params_open + 1:params_end - 1],
    )
    if not params:
        return False
    first_param = re.match(
        r"\s*(?:private\s+|protected\s+|public\s+|readonly\s+)*"
        r"([A-Za-z_][A-Za-z0-9_]*)",
        params[0][1],
    )
    span = method_body_span(definitions, name, definitions_code)
    if not first_param or not span:
        return False
    body = definitions[span[0]:span[1]]
    body_code = definitions_code[span[0]:span[1]]
    first_param_name = first_param.group(1)
    # A same-spelled nested binding is not the helper parameter. Without a
    # binding-aware AST, reject the helper rather than treating the shadow as
    # route-preserving merely because its identifier text matches.
    if has_nonimport_binding(body_code, first_param_name):
        return False
    safe_idents = {first_param_name}
    declarations = []
    for declaration in re.finditer(
        r"\b(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=;]+)?=",
        body_code,
    ):
        value_end = find_statement_end(body_code, declaration.end())
        if value_end != -1:
            declarations.append((
                declaration.group(1),
                body[declaration.end():value_end],
                body_code[declaration.end():value_end],
            ))
    for declaration in re.finditer(
        r"\b(?:const|let)\s*\{([^}]*)\}\s*(?::[^=;]+)?=",
        body_code,
    ):
        path_binding = None
        for part in declaration.group(1).split(","):
            names = [name.strip() for name in part.split(":", 1)]
            if names[0] == "path":
                path_binding = names[-1]
        value_end = find_statement_end(body_code, declaration.end())
        if (
            path_binding
            and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", path_binding)
            and value_end != -1
        ):
            declarations.append((
                path_binding,
                body[declaration.end():value_end],
                body_code[declaration.end():value_end],
            ))
    progressed = True
    while progressed:
        progressed = False
        for ident, rhs, rhs_code in declarations:
            if ident not in safe_idents and expression_preserves_route_ident(
                rhs,
                rhs_code,
                safe_idents,
                definitions,
                definitions_code,
                helper_stack,
            ):
                safe_idents.add(ident)
                progressed = True

    for ident in safe_idents:
        simple_write = re.compile(
            r"(?<![A-Za-z0-9_.$])"+re.escape(ident)+r"\s*=(?!=|>)"
        )
        for write in simple_write.finditer(body_code):
            prefix = body_code[max(0, write.start() - 16):write.start()]
            if re.search(r"\b(?:const|let)\s*$", prefix):
                continue
            value_end = find_statement_end(body_code, write.end())
            if value_end == -1 or not expression_preserves_route_ident(
                body[write.end():value_end],
                body_code[write.end():value_end],
                safe_idents,
                definitions,
                definitions_code,
                helper_stack,
            ):
                return False
        compound_write = re.compile(
            r"(?<![A-Za-z0-9_.$])"+re.escape(ident)
            +r"\s*(\+=|-=|\*=|/=|%=|&&=|\|\|=|\?\?=)"
        )
        for write in compound_write.finditer(body_code):
            value_end = find_statement_end(body_code, write.end())
            if value_end == -1:
                return False
            templates = list(executable_template_matches(
                body[write.end():value_end], body_code[write.end():value_end]
            ))
            if not (
                write.group(1) == "+="
                and len(templates) == 1
                and templates[0].group(1).startswith(("?", "&"))
            ):
                return False

    found_return = False
    for ret in re.finditer(r"\breturn\b", body_code):
        value_end = find_statement_end(body_code, ret.end())
        if value_end == -1:
            return False
        value = body[ret.end():value_end]
        value_code = body_code[ret.end():value_end]
        found_return = True
        stripped = value_code.strip()
        path_expr = value
        path_code = value_code
        if stripped.startswith("{") and stripped.endswith("}"):
            object_start = value_code.index("{")
            object_end = value_code.rindex("}")
            properties = split_top_commas_aligned(
                value[object_start + 1:object_end],
                value_code[object_start + 1:object_end],
            )
            if any(
                property_has_computed_name(prop_code)
                or prop_code.strip().startswith("...")
                for _, prop_code in properties
            ):
                return False
            path_expr = None
            path_code = None
            for prop, prop_code in properties:
                explicit = re.match(r"\s*path\s*:\s*(.+)", prop, re.S)
                if explicit and re.match(r"\s*path\s*:", prop_code):
                    colon = prop_code.index(":")
                    path_expr = prop[colon + 1:]
                    path_code = prop_code[colon + 1:]
                elif prop_code.strip() == "path":
                    path_expr = "path"
                    path_code = "path"
        if path_expr is None or not expression_preserves_route_ident(
            path_expr,
            path_code,
            safe_idents,
            definitions,
            definitions_code,
            helper_stack,
        ):
            return False
    return found_return

def direct_class_helper_usage_is_safe(
    expr, expr_code, definitions, definitions_code, matches
):
    """Validate ``this.helper(route, ...)`` by its helper implementation."""
    if not definitions or not definitions_code:
        return False
    leading = len(expr_code) - len(expr_code.lstrip())
    trailing = len(expr_code.rstrip())
    trimmed_expr = expr[leading:trailing]
    trimmed_code = expr_code[leading:trailing]
    stripped = strip_enclosing_parens(trimmed_code)
    helper = re.match(r"this\.([A-Za-z_][A-Za-z0-9_]*)\s*\(", stripped)
    if not helper:
        return False
    open_paren = stripped.index("(", helper.start())
    close = match_close(stripped, open_paren, "(", ")")
    if close != len(stripped):
        return False
    # Views remain aligned before outer grouping is stripped in all current
    # call sites; reject unusual grouped helper expressions conservatively.
    if trimmed_code != stripped:
        return False
    args = split_top_commas_aligned(
        trimmed_expr[open_paren + 1:close - 1],
        trimmed_code[open_paren + 1:close - 1],
    )
    if not args:
        return False
    first_matches = list(executable_template_matches(args[0][0], args[0][1]))
    return bool(
        first_matches
        and len(first_matches) == len(list(matches))
        and direct_template_usage_is_safe(
            args[0][0],
            args[0][1],
            first_matches,
            definitions,
            definitions_code,
        )
        and helper_preserves_first_parameter(
            definitions, definitions_code, helper.group(1)
        )
    )

def resolve_path_expr(expr, ctx, ctx_code, definitions=None, definitions_code=None):
    """Resolve a path expression to a template string. Handles inline templates,
    helper-wrapped templates, and local `const x = ...` variable references
    (tracing through helper-call arguments like buildFoo(basePath, params)).

    `ctx` and `definitions` retain literals; their aligned code-token views are
    used for discovery so quoted examples cannot masquerade as executable path
    assignments or helper returns. Complete definitions are needed when a
    request calls a class method declared after the call site, such as
    `this.buildListPath(params)`.
    """
    assert len(ctx) == len(ctx_code), "source/code context views must stay aligned"
    assert (definitions is None) == (definitions_code is None)
    if definitions is not None:
        assert len(definitions) == len(definitions_code)
    expr = expr.strip()
    expr_code = lex_ts_source(expr)[1]
    direct_matches = list(executable_template_matches(expr, expr_code))
    direct_candidates = {
        match.group(1)
        for match in direct_matches
    }
    if direct_candidates and not direct_template_usage_is_safe(
        expr,
        expr_code,
        direct_matches,
        definitions,
        definitions_code,
    ) and not direct_class_helper_usage_is_safe(
        expr, expr_code, definitions, definitions_code, direct_matches
    ):
        return None
    if has_top_level_choice(expr_code) and (
        len(direct_candidates) < 2 or not route_templates_agree(direct_candidates)
    ):
        return None

    def class_helper_templates(call_expr, call_code, depth):
        if depth > 6:
            return set()
        stripped_call = strip_enclosing_parens(call_code)
        helper_call = re.match(r"this\.([A-Za-z_][A-Za-z0-9_]*)\s*\(", stripped_call)
        if not helper_call or not definitions or not definitions_code:
            return set()
        call_open = stripped_call.index("(", helper_call.start())
        if match_close(stripped_call, call_open, "(", ")") != len(stripped_call):
            return set()
        span = method_body_span(definitions, helper_call.group(1), definitions_code)
        if not span:
            return set()
        body = definitions[span[0]:span[1]]
        body_code = definitions_code[span[0]:span[1]]
        candidates = set()
        found_return = False
        for ret in re.finditer(r"\breturn\b", body_code):
            found_return = True
            value_start = ret.end()
            value_end = find_statement_end(body_code, value_start)
            if value_end == -1:
                return set()
            value = body[value_start:value_end]
            value_code = body_code[value_start:value_end]
            if value_code.strip().startswith("{") and value_code.strip().endswith("}"):
                object_start = value_code.index("{")
                object_end = value_code.rindex("}")
                path_value = None
                properties = split_top_commas_aligned(
                    value[object_start + 1:object_end],
                    value_code[object_start + 1:object_end],
                )
                if any(
                    property_has_computed_name(prop_code)
                    or prop_code.strip().startswith("...")
                    for _, prop_code in properties
                ):
                    return set()
                for prop, prop_code in properties:
                    explicit = re.match(r"\s*path\s*:\s*(.+)", prop, re.S)
                    if explicit and re.match(r"\s*path\s*:", prop_code):
                        colon = prop_code.index(":")
                        path_value = (
                            prop[colon + 1:],
                            prop_code[colon + 1:],
                        )
                    elif prop_code.strip() == "path":
                        path_value = ("path", "path")
                if path_value is None:
                    return set()
                value, value_code = path_value
            value_matches = list(executable_template_matches(value, value_code))
            value_candidates = {match.group(1) for match in value_matches}
            if value_candidates and not direct_template_usage_is_safe(
                value,
                value_code,
                value_matches,
                definitions,
                definitions_code,
            ):
                return set()
            if has_top_level_choice(value_code) and (
                len(value_candidates) < 2 or not route_templates_agree(value_candidates)
            ):
                return set()
            if not value_candidates:
                value_candidates.update(
                    class_helper_templates(value, value_code, depth + 1)
                )
                value_candidates.update(
                    try_ident_templates(
                        value,
                        value_code,
                        body[:ret.start()],
                        body_code[:ret.start()],
                        set(),
                        depth + 1,
                    )
                )
            if not route_templates_agree(value_candidates):
                return set()
            candidates.add(min(value_candidates, key=len))
        return (
            {min(candidates, key=len)}
            if found_return and route_templates_agree(candidates)
            else set()
        )

    # Gather every route candidate reachable through visible local bindings.
    # The caller accepts the expression only when all candidates agree.
    def try_ident_templates(s, code_s, local_ctx, local_code, seen, depth):
        if depth > 6:
            return set()
        candidates = set()
        for idm in re.finditer(r"[A-Za-z_][A-Za-z0-9_]*", code_s):
            ident = idm.group(0)
            if ident in seen or ident in {
                "as", "const", "false", "let", "new", "null", "return",
                "this", "true", "undefined",
            }:
                continue
            previous = idm.start() - 1
            while previous >= 0 and code_s[previous].isspace():
                previous -= 1
            if previous >= 0 and code_s[previous] == ".":
                continue
            following = idm.end()
            while following < len(code_s) and code_s[following].isspace():
                following += 1
            if following < len(code_s) and code_s[following] == ":":
                continue
            declarations = []
            declaration = re.compile(
                r"\b(?:const|let)\s+"+re.escape(ident)+r"\s*(?::[^=;]+)?="
            )
            for assignment in declaration.finditer(local_code):
                value_start = assignment.end()
                value_end = find_statement_end(local_code, value_start)
                if value_end != -1:
                    declarations.append(
                        (
                            assignment.start(),
                            local_ctx[value_start:value_end],
                            local_code[value_start:value_end],
                        )
                    )
            # Path/query helpers conventionally return an object which callers
            # immediately destructure. Treat the RHS as the local definition of
            # `path`; choosing the latest assignment keeps resolution scoped to
            # the closest call site instead of an earlier method's `path` local.
            destructuring = re.compile(
                r"\b(?:const|let)\s*\{([^}]*)\}\s*(?::[^=;]+)?="
            )
            for assignment in destructuring.finditer(local_code):
                names = {
                    part.strip().split(":", 1)[-1].strip()
                    for part in assignment.group(1).split(",")
                }
                if ident in names:
                    value_start = assignment.end()
                    value_end = find_statement_end(local_code, value_start)
                    if value_end != -1:
                        declarations.append(
                            (
                                assignment.start(),
                                local_ctx[value_start:value_end],
                                local_code[value_start:value_end],
                            )
                        )
            for binding_pos, rhs, rhs_code in visible_assignments(
                declarations, local_code
            ):
                rhs_matches = list(executable_template_matches(rhs, rhs_code))
                rhs_candidates = {match.group(1) for match in rhs_matches}
                if rhs_candidates and not direct_template_usage_is_safe(
                    rhs,
                    rhs_code,
                    rhs_matches,
                    definitions,
                    definitions_code,
                ) and not direct_class_helper_usage_is_safe(
                    rhs, rhs_code, definitions, definitions_code, rhs_matches
                ):
                    return set()
                if has_top_level_choice(rhs_code) and (
                    len(rhs_candidates) < 2 or not route_templates_agree(rhs_candidates)
                ):
                    return set()
                if not rhs_candidates:
                    rhs_candidates.update(
                        class_helper_templates(rhs, rhs_code, depth + 1)
                    )
                    wrapper_ident = route_wrapper_first_identifier(
                        rhs_code, definitions, definitions_code
                    )
                    if wrapper_ident:
                        rhs_candidates.update(
                            try_ident_templates(
                                wrapper_ident,
                                wrapper_ident,
                                local_ctx[:binding_pos],
                                local_code[:binding_pos],
                                seen - {ident},
                                depth + 1,
                            )
                        )
                    elif simple_identifier_expression(rhs_code):
                        rhs_candidates.update(
                            try_ident_templates(
                                rhs,
                                rhs_code,
                                local_ctx[:binding_pos],
                                local_code[:binding_pos],
                                seen - {ident},
                                depth + 1,
                            )
                        )
                if not route_templates_agree(rhs_candidates):
                    return set()

                # A mutable path may be rewritten after its declaration. Every
                # write to this lexical binding must be query-only or resolve
                # to the same route; unknown transformations poison coverage.
                binding_candidates = set(rhs_candidates)
                simple_write = re.compile(
                    r"(?<![A-Za-z0-9_.$])"+re.escape(ident)+r"\s*=(?!=|>)"
                )
                for write in simple_write.finditer(local_code, binding_pos + 1):
                    declaration_prefix = local_code[
                        max(0, write.start() - 16):write.start()
                    ]
                    if re.search(r"\b(?:const|let)\s*$", declaration_prefix):
                        continue
                    visible_at_write = visible_assignments(
                        [item for item in declarations if item[0] < write.start()],
                        local_code[:write.start()],
                    )
                    if not visible_at_write or visible_at_write[0][0] != binding_pos:
                        continue
                    value_start = write.end()
                    value_end = find_statement_end(local_code, value_start)
                    if value_end == -1:
                        return set()
                    write_rhs = local_ctx[value_start:value_end]
                    write_code = local_code[value_start:value_end]
                    if self_assignment_is_route_preserving(
                        ident,
                        write_rhs,
                        write_code,
                        definitions,
                        definitions_code,
                    ):
                        continue
                    write_matches = list(
                        executable_template_matches(write_rhs, write_code)
                    )
                    write_candidates = {
                        match.group(1) for match in write_matches
                    }
                    if write_candidates and not direct_template_usage_is_safe(
                        write_rhs,
                        write_code,
                        write_matches,
                        definitions,
                        definitions_code,
                    ):
                        return set()
                    if not write_candidates and simple_identifier_expression(write_code):
                        write_candidates.update(
                            try_ident_templates(
                                write_rhs,
                                write_code,
                                local_ctx[:write.start()],
                                local_code[:write.start()],
                                seen - {ident},
                                depth + 1,
                            )
                        )
                    if not route_templates_agree(write_candidates):
                        return set()
                    binding_candidates.update(write_candidates)

                compound_write = re.compile(
                    r"(?<![A-Za-z0-9_.$])"+re.escape(ident)
                    +r"\s*(\+=|-=|\*=|/=|%=|&&=|\|\|=|\?\?=)"
                )
                for write in compound_write.finditer(local_code, binding_pos + 1):
                    visible_at_write = visible_assignments(
                        [item for item in declarations if item[0] < write.start()],
                        local_code[:write.start()],
                    )
                    if not visible_at_write or visible_at_write[0][0] != binding_pos:
                        continue
                    value_start = write.end()
                    value_end = find_statement_end(local_code, value_start)
                    if value_end == -1:
                        return set()
                    write_rhs = local_ctx[value_start:value_end]
                    write_code = local_code[value_start:value_end]
                    write_templates = list(
                        executable_template_matches(write_rhs, write_code)
                    )
                    if not (
                        write.group(1) == "+="
                        and len(write_templates) == 1
                        and write_templates[0].group(1).startswith(("?", "&"))
                        and direct_template_usage_is_safe(
                            write_rhs,
                            write_code,
                            write_templates,
                            definitions,
                            definitions_code,
                        )
                    ):
                        return set()

                if has_destructuring_write(local_code, ident, binding_pos + 1):
                    return set()

                if re.search(
                    r"(?:\+\+|--)\s*"+re.escape(ident)
                    +r"\b|\b"+re.escape(ident)+r"\s*(?:\+\+|--)",
                    local_code[binding_pos + 1:],
                ):
                    return set()
                if not route_templates_agree(binding_candidates):
                    return set()
                candidates.update(binding_candidates)
        return candidates

    # Resolve direct class path-helper calls through the helper's return value.
    # The helper may be declared below the request, hence the separate complete
    # definitions source rather than only the call-site context.
    candidates = direct_candidates
    if not candidates:
        helper_candidates = class_helper_templates(expr, expr_code, 0)
        candidates.update(helper_candidates)
        if not helper_candidates and simple_identifier_expression(expr_code):
            candidates.update(
                try_ident_templates(expr, expr_code, ctx, ctx_code, set(), 0)
            )
    return min(candidates, key=len) if route_templates_agree(candidates) else None

def resolve_template(tpl, fieldmap, helper):
    """Resolve a template's leading base token through client wiring."""
    bt = re.match(r"\$\{([^}]*)\}", tpl)
    if not bt: return None, None, "no-base-token:"+tpl[:80]
    token, suffix = bt.group(1), tpl[bt.end():]
    prefix = None
    m1 = re.fullmatch(r"this\.([A-Za-z0-9_]+)", token)
    m2 = re.fullmatch(r"this\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)", token)
    m3 = re.fullmatch(r"this\.([A-Za-z0-9_]+)\(\)\.([A-Za-z0-9_]+)", token)
    m4 = re.fullmatch(r"this\.([A-Za-z0-9_]+)\(\)", token)
    if m1 and m1.group(1) in fieldmap and isinstance(fieldmap[m1.group(1)], str):
        prefix = fieldmap[m1.group(1)]
    elif m2 and isinstance(fieldmap.get(m2.group(1)), dict):
        prefix = fieldmap[m2.group(1)].get(m2.group(2))
    elif m3 and isinstance(helper.get(m3.group(1)), dict):
        prefix = helper[m3.group(1)].get(m3.group(2))
    elif m4 and isinstance(helper.get(m4.group(1)), str):
        prefix = helper[m4.group(1)]
    elif token == "base" and "requireAgileBaseUrl" in helper:
        prefix = helper["requireAgileBaseUrl"]
    if prefix is None: return None, None, "unresolved-token:"+token
    return prefix, suffix, None

def method_body_span(src, name, code_src=None):
    """Return the body span of a class method or module function."""
    scan = code_src if code_src is not None else src
    m = helper_declaration_match(scan, name)
    if not m: return None
    op = scan.index("(", m.start())
    params_end = match_close(scan, op, "(", ")")
    if params_end == -1: return None
    cursor = params_end
    while cursor < len(scan) and scan[cursor].isspace():
        cursor += 1
    if cursor < len(scan) and scan[cursor] == ":":
        cursor += 1
        angle = paren = bracket = 0
        seen_type_token = False
        while cursor < len(scan):
            token = scan[cursor]
            if token == "<": angle += 1
            elif token == ">" and angle: angle -= 1
            elif token == "(": paren += 1
            elif token == ")" and paren: paren -= 1
            elif token == "[": bracket += 1
            elif token == "]" and bracket: bracket -= 1
            elif token == "{":
                previous = cursor - 1
                while previous >= params_end and scan[previous].isspace():
                    previous -= 1
                if (
                    angle or paren or bracket or not seen_type_token
                    or (previous >= 0 and scan[previous] in "|&")
                    or scan[max(0, previous - 1):previous + 1] == "=>"
                ):
                    type_end = match_close(scan, cursor, "{", "}")
                    if type_end == -1:
                        return None
                    cursor = type_end
                    seen_type_token = True
                    continue
                body_start = cursor
                break
            elif not token.isspace():
                seen_type_token = True
            cursor += 1
        else:
            return None
    else:
        body_start = scan.find("{", cursor)
    if body_start == -1: return None
    body_end = match_close(scan, body_start, "{", "}")
    return (body_start, body_end) if body_end != -1 else None

def enclosing_method_scope_starts(code_src, positions):
    """Map call offsets to their containing class member body's first offset.

    Local path resolution must not borrow a same-named declaration from an
    earlier class method. Because the code-only view has balanced braces, the
    second still-open block inside the containing class is the current member
    body; deeper blocks remain part of that same lexical scope chain. All call
    positions are resolved in one source pass to keep the coverage check fast.
    """
    targets = sorted(set(positions))
    if not targets:
        return {}
    class_bodies = {
        body_start
        for class_match in re.finditer(r"\bclass\s+[A-Za-z_][A-Za-z0-9_]*", code_src)
        if (body_start := code_src.find("{", class_match.end())) != -1
    }
    result = {}
    stack = []
    target_index = 0
    for index, token in enumerate(code_src[:targets[-1] + 1]):
        while target_index < len(targets) and targets[target_index] == index:
            target = targets[target_index]
            class_index = next(
                (level for level in range(len(stack) - 1, -1, -1)
                 if stack[level] in class_bodies),
                None,
            )
            result[target] = (
                stack[class_index + 1] + 1
                if class_index is not None and class_index + 1 < len(stack)
                else 0
            )
            target_index += 1
        if token == "{":
            stack.append(index)
        elif token == "}" and stack:
            stack.pop()
    return result

@functools.lru_cache(maxsize=None)
def nested_callable_spans(source, code, primary_class_body_start):
    """Precompute nested callable parameter/body intervals for one resource module."""
    spans = []
    for class_match in re.finditer(r"\bclass\b", code):
        body_start = code.find("{", class_match.end())
        if body_start == primary_class_body_start:
            continue
        body_end = match_close(code, body_start, "{", "}") if body_start != -1 else -1
        if body_end != -1:
            spans.append((body_start, body_end))

    for function in re.finditer(
        r"\bfunction\b(?:\s*\*)?(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?"
        r"\s*(?:<[^;{}()]*>)?\s*\(",
        code,
    ):
        params_open = code.index("(", function.start(), function.end())
        params_end = match_close(code, params_open, "(", ")")
        if params_end == -1:
            continue
        spans.append((params_open + 1, params_end - 1))
        body_start = code.find("{", params_end)
        body_end = match_close(code, body_start, "{", "}") if body_start != -1 else -1
        if body_end != -1:
            spans.append((body_start, body_end))

    method_code = quoted_method_code_view(source, code)
    direct_member_params = set()
    for (
        params_start,
        params_end,
        body_start,
        body_end,
        parent_brace,
        _,
        method_name,
    ) in method_declaration_spans(method_code):
        # The selected resource's direct members are the supported callable
        # layer. Object-literal methods (or methods nested in local constructs)
        # have another open scope between their body and the resource class.
        parameter_scope = brace_scope_at(code, params_start)
        if (
            parent_brace == primary_class_body_start
            and method_name != "constructor"
            and parameter_scope
            and parameter_scope[-1] == primary_class_body_start
        ):
            direct_member_params.add((params_start, params_end))
        else:
            spans.append((params_start, params_end))
        if parent_brace != primary_class_body_start:
            spans.append((body_start, body_end))

    # Default expressions execute in their callable's scope, before its body.
    # Keep direct resource-member parameters at the supported callable layer;
    # all other callable parameters are nested/uncalled just like their bodies.
    spans.extend(
        span
        for span in callable_parameter_spans(code)
        if span not in direct_member_params
    )

    for arrow in re.finditer(r"=>", code):
        body_start = arrow.end()
        while body_start < len(code) and code[body_start].isspace():
            body_start += 1
        if body_start < len(code) and code[body_start] == "{":
            body_end = match_close(code, body_start, "{", "}")
            if body_end != -1:
                spans.append((body_start, body_end))
            continue

        depth = {"(": 0, "{": 0, "[": 0}
        pairs = {")": "(", "}": "{", "]": "["}
        body_end = len(code)
        for index in range(body_start, len(code)):
            token = code[index]
            if token in depth:
                depth[token] += 1
            elif token in pairs:
                opener = pairs[token]
                if depth[opener] == 0:
                    body_end = index
                    break
                depth[opener] -= 1
            elif token in {",", ";"} and not any(depth.values()):
                body_end = index
                break
        if body_start < body_end:
            spans.append((body_start - 1, body_end))
    return tuple(sorted(set(spans)))

def nested_callable_at(source, code, position, primary_class_body_start):
    """Reject requests hidden in nested functions, arrows, or local classes."""
    if any(
        body_start < position < body_end
        for body_start, body_end in nested_callable_spans(
            source, code, primary_class_body_start
        )
    ):
        return True

    return False

def request_spread_is_route_safe(prop_code):
    """Recognize the one proven route-neutral request spread used by the SDK."""
    return bool(re.fullmatch(
        r"\s*\.\.\.\(\s*Object\.keys\(\s*query\s*\)\.length\s*>\s*0"
        r"\s*&&\s*\{\s*query\s*\}\s*\)\s*",
        prop_code,
    ))

def extract(api):
    source_root = os.path.abspath(CLI_ARGS.source_root)
    res_dir = os.path.join(source_root, "src", api, "resources")
    client_src, client_code = lex_ts_source(
        open(os.path.join(source_root, "src", api, "client.ts")).read()
    )
    varmap = parse_base_suffixes(client_src, client_code)
    wiring = parse_wiring(client_src, client_code, varmap)
    results, unknowns = [], []
    seen_resource_classes = set()
    resource_files = sorted({
        f
        for pattern in ("*.ts", "*.mts", "*.cts", "*.tsx")
        for f in glob.glob(os.path.join(res_dir, "**", pattern), recursive=True)
    })
    for f in resource_files:
        src, code_src = lex_ts_source(open(f).read())
        escaped_syntax = UNICODE_ESCAPE.search(code_src)
        if escaped_syntax:
            unknowns.append((
                os.path.relpath(f, res_dir),
                "unsupported-escaped-identifier",
                src[escaped_syntax.start():escaped_syntax.start() + 80],
            ))
            continue
        # ECMAScript identifiers may use the full Unicode identifier tables.
        # This lexical analyzer deliberately rejects raw non-ASCII executable
        # syntax rather than risk skipping a request hidden behind such a name.
        non_ascii_syntax = re.search(r"[^\x00-\x7f]", code_src)
        if non_ascii_syntax:
            unknowns.append((
                os.path.relpath(f, res_dir),
                "unsupported-non-ascii-syntax",
                src[non_ascii_syntax.start():non_ascii_syntax.start() + 80],
            ))
            continue
        member_accesses = executable_member_accesses(src, code_src)
        computed_member_calls = executable_computed_member_invocations(code_src)
        computed_this_accesses = list(re.finditer(r"\bthis\s*\[", code_src))
        class_matches = list(
            re.finditer(
                r"export\s+class\s+([A-Z][A-Za-z0-9]*Resource)\b",
                code_src,
            )
        )
        if len(class_matches) != 1:
            request_member = next(
                (access for access in member_accesses if access[3] == "request"),
                None,
            )
            transport_type = re.search(r"\bTransport\b", code_src)
            transport_use = re.search(r"\btransport\b", code_src)
            hazard_position = (
                request_member[0]
                if request_member is not None
                else computed_member_calls[0].start()
                if computed_member_calls
                else computed_this_accesses[0].start()
                if computed_this_accesses
                else transport_type.start()
                if transport_type
                else transport_use.start()
                if transport_use
                else None
            )
            if hazard_position is not None:
                unknowns.append(
                    (
                        os.path.relpath(f, res_dir),
                        "unrecognized-resource-file",
                        src[hazard_position:hazard_position + 80],
                    )
                )
            continue
        clsm = class_matches[0]
        cls = clsm.group(1)
        if cls in seen_resource_classes:
            unknowns.append((
                os.path.relpath(f, res_dir),
                "duplicate-resource-class",
                cls,
            ))
            continue
        seen_resource_classes.add(cls)
        if cls not in wiring:
            unknowns.append((
                os.path.relpath(f, res_dir),
                "unwired-resource-class",
                cls,
            ))
            continue
        class_body_start = code_src.find("{", clsm.end())
        class_body_end = (
            match_close(code_src, class_body_start, "{", "}")
            if class_body_start != -1 else -1
        )
        method_code_src = quoted_method_code_view(src, code_src)
        direct_class_members = [
            declaration
            for declaration in method_declaration_spans(method_code_src)
            if declaration[4] == class_body_start
        ]

        def containing_direct_member(position):
            return next(
                (
                    declaration
                    for declaration in direct_class_members
                    if (
                        declaration[0] <= position < declaration[1]
                        or declaration[2] < position < declaration[3]
                    )
                ),
                None,
            )
        params = parse_ctor_params(src, code_src)
        wargs = wiring.get(cls, [])
        fieldmap = {params[i]: wargs[i] for i in range(min(len(params), len(wargs)))}
        helper = {}
        if "agileBaseUrl" in fieldmap: helper["requireAgileBaseUrl"] = fieldmap["agileBaseUrl"]
        dict_field = next((k for k, v in fieldmap.items() if isinstance(v, dict)), None)
        if dict_field: helper["requireDevopsBaseUrls"] = fieldmap[dict_field]

        helper_calls = {
            helper_name: list(
                re.finditer(r"\bthis\."+re.escape(helper_name)+r"\s*\(", code_src)
            )
            for helper_name in {"requestSoftwareIssues"}
        }
        request_calls, unsupported_request_calls = find_request_call_objects(code_src)
        unknowns.extend(
            (
                os.path.basename(f),
                "nonliteral-request-options",
                src[call_start:call_start + 80],
            )
            for call_start in unsupported_request_calls
        )
        constructor = re.search(r"\bconstructor\s*\(", code_src)
        constructor_span = None
        if constructor:
            params_open = code_src.index("(", constructor.start())
            params_end = match_close(code_src, params_open, "(", ")")
            if params_end != -1:
                constructor_span = (params_open, params_end)
        accounted_request_transports = {
            call_start + len("this.")
            for call_start, _, _ in request_calls
        } | {
            call_start + len("this.")
            for call_start in unsupported_request_calls
        }
        approved_forwarding = approved_transport_forwarding_positions(src, code_src)
        unknowns.extend(
            (
                os.path.basename(f),
                "unsupported-computed-instance-access",
                src[access.start():access.end() + 60],
            )
            for access in computed_this_accesses
        )
        unknowns.extend(
            (
                os.path.basename(f),
                "unsupported-computed-member-invocation",
                src[call.start():call.end() + 60],
            )
            for call in computed_member_calls
        )
        request_call_ranges = [
            (call_start, call_paren)
            for call_start, call_paren, _ in request_calls
        ] + [
            (call_start, call_start + len("this.transport.request"))
            for call_start in unsupported_request_calls
        ]
        for access_start, member_start, member_end, member_name in member_accesses:
            if member_name == "request":
                if any(
                    call_start <= access_start < call_end
                    for call_start, call_end in request_call_ranges
                ):
                    continue
                unknowns.append((
                    os.path.basename(f),
                    "unsupported-request-member-use",
                    src[access_start:member_end + 60],
                ))
            elif member_name == "transport":
                if (
                    member_start in accounted_request_transports
                    or member_start in approved_forwarding
                ):
                    continue
                unknowns.append((
                    os.path.basename(f),
                    "unsupported-transport-member-use",
                    src[access_start:member_end + 60],
                ))
        for transport_use in re.finditer(r"\btransport\b", code_src):
            position = transport_use.start()
            if (
                position in accounted_request_transports
                or position in approved_forwarding
                or (
                    constructor_span is not None
                    and constructor_span[0] < position < constructor_span[1]
                )
            ):
                continue
            unknowns.append(
                (
                    os.path.basename(f),
                    "unsupported-transport-use",
                    src[position:position + 80],
                )
            )
        scope_starts = enclosing_method_scope_starts(
            code_src,
            [
                call.start()
                for calls in helper_calls.values()
                for call in calls
            ] + [call_start for call_start, _, _ in request_calls],
        )

        # A helper-backed request represents one operation for every concrete
        # call-site path. Expand those paths before scanning direct transport
        # calls, and skip the helper's own variable `finalPath` request.
        delegated_spans = []
        for helper_name, helper_verb in {"requestSoftwareIssues": "GET"}.items():
            span = method_body_span(src, helper_name, code_src)
            calls = helper_calls[helper_name]
            if not span or not calls: continue
            delegated_spans.append(span)
            for call in calls:
                containing_member = containing_direct_member(call.start())
                if containing_member is not None and containing_member[5] != "public":
                    unknowns.append((
                        os.path.basename(f),
                        "nonpublic-helper-call",
                        src[call.start():call.start() + 80],
                    ))
                    continue
                if (
                    not class_body_start < call.start() < class_body_end
                    or nested_callable_at(src, code_src, call.start(), class_body_start)
                ):
                    unknowns.append((
                        os.path.basename(f),
                        "unsupported-helper-call-scope",
                        src[call.start():call.start() + 80],
                    ))
                    continue
                if statically_dead_at(code_src, call.start(), src):
                    unknowns.append(
                        (os.path.basename(f), "statically-dead-helper-call", helper_name)
                    )
                    continue
                conditional_control = conditional_control_at(code_src, call.start())
                if conditional_control:
                    unknowns.append((
                        os.path.basename(f),
                        "conditional-helper-call",
                        conditional_control,
                    ))
                    continue
                destructuring_default = destructuring_default_at(
                    code_src, call.start()
                )
                if destructuring_default:
                    unknowns.append((
                        os.path.basename(f),
                        "conditional-helper-default",
                        destructuring_default,
                    ))
                    continue
                conditional_expression = conditional_expression_at(
                    code_src, call.start()
                )
                if conditional_expression:
                    unknowns.append((
                        os.path.basename(f),
                        "conditional-helper-expression",
                        conditional_expression,
                    ))
                    continue
                op = code_src.index("(", call.start())
                end = match_close(code_src, op, "(", ")")
                args = (
                    split_top_commas_aligned(
                        src[op+1:end-1],
                        code_src[op+1:end-1],
                    )
                    if end != -1 else []
                )
                if not args:
                    unknowns.append((os.path.basename(f), "no-helper-path", helper_name)); continue
                scope_start = scope_starts[call.start()]
                tpl = resolve_path_expr(
                    args[0][0],
                    src[scope_start:call.start()],
                    code_src[scope_start:call.start()],
                    src,
                    code_src,
                )
                if not tpl:
                    unknowns.append((os.path.basename(f), "unresolved-helper-path", args[0][:80])); continue
                prefix, suffix, error = resolve_template(tpl, fieldmap, helper)
                if error:
                    unknowns.append((os.path.basename(f), error, tpl[:80])); continue
                full = prefix + suffix
                results.append({"prefix": prefix, "verb": helper_verb, "suffix": norm(suffix),
                                "norm_full": norm(full), "file": os.path.basename(f)})

        for call_start, _call_paren, obj_start in request_calls:
            if any(start <= call_start < end for start, end in delegated_spans):
                continue
            containing_member = containing_direct_member(call_start)
            if containing_member is not None and containing_member[5] != "public":
                unknowns.append((
                    os.path.basename(f),
                    "nonpublic-request-call",
                    src[call_start:call_start + 80],
                ))
                continue
            if (
                not class_body_start < call_start < class_body_end
                or nested_callable_at(src, code_src, call_start, class_body_start)
            ):
                unknowns.append((
                    os.path.basename(f),
                    "unsupported-request-call-scope",
                    src[call_start:call_start + 80],
                ))
                continue
            if statically_dead_at(code_src, call_start, src):
                unknowns.append(
                    (os.path.basename(f), "statically-dead-request", src[call_start:call_start + 80])
                )
                continue
            conditional_control = conditional_control_at(code_src, call_start)
            if conditional_control:
                unknowns.append((
                    os.path.basename(f),
                    "conditional-request-call",
                    conditional_control,
                ))
                continue
            destructuring_default = destructuring_default_at(
                code_src, call_start
            )
            if destructuring_default:
                unknowns.append((
                    os.path.basename(f),
                    "conditional-request-default",
                    destructuring_default,
                ))
                continue
            conditional_expression = conditional_expression_at(code_src, call_start)
            if conditional_expression:
                unknowns.append((
                    os.path.basename(f),
                    "conditional-request-expression",
                    conditional_expression,
                ))
                continue
            obj_end = match_close(code_src, obj_start, "{", "}")
            obj = src[obj_start:obj_end]
            obj_code = code_src[obj_start:obj_end]
            scope_start = scope_starts[call_start]
            ctx = src[scope_start:call_start]
            ctx_code = code_src[scope_start:call_start]
            props = split_top_commas_aligned(obj[1:-1], obj_code[1:-1])
            unsafe_computed_key = next(
                (
                    prop_code.strip()
                    for _, prop_code in props
                    if property_has_computed_name(prop_code)
                ),
                None,
            )
            if unsafe_computed_key is not None:
                unknowns.append(
                    (
                        os.path.basename(f),
                        "computed-request-property",
                        unsafe_computed_key[:80],
                    )
                )
                continue
            unsafe_spread = next(
                (
                    prop_code.strip()
                    for _, prop_code in props
                    if prop_code.strip().startswith("...")
                    and not request_spread_is_route_safe(prop_code)
                ),
                None,
            )
            if unsafe_spread is not None:
                unknowns.append(
                    (os.path.basename(f), "route-unsafe-request-spread", unsafe_spread[:80])
                )
                continue
            verb = None; expr = None
            for prop, prop_code in props:
                mm = re.match(r"\s*method\s*:\s*'([A-Z]+)'", prop)
                if not re.match(r"\s*method\s*:", prop_code):
                    mm = None
                if mm: verb = mm.group(1)
                pp = re.match(r"\s*path\s*:\s*(.+)", prop, re.S)
                if not re.match(r"\s*path\s*:", prop_code):
                    pp = None
                if pp: expr = pp.group(1).strip()
                elif prop_code.strip() == "path": expr = "path"  # shorthand
            if not verb:
                unknowns.append((os.path.basename(f), "no-method", obj[:80])); continue
            if expr is None:
                unknowns.append((os.path.basename(f), "no-path", obj[:80])); continue
            tpl = resolve_path_expr(expr, ctx, ctx_code, src, code_src)
            if not tpl:
                unknowns.append((os.path.basename(f), "unresolved-path", expr[:80])); continue
            prefix, suffix, error = resolve_template(tpl, fieldmap, helper)
            if error:
                unknowns.append((os.path.basename(f), error, tpl[:80])); continue
            full = prefix + suffix
            results.append({"prefix": prefix, "verb": verb, "suffix": norm(suffix),
                            "norm_full": norm(full),
                            "file": os.path.basename(f)})
    for cls in sorted(set(wiring) - seen_resource_classes):
        unknowns.append((
            "client.ts",
            "wired-resource-class-not-scanned",
            cls,
        ))
    return results, unknowns, varmap

def fail_spec(name, message):
    print(f"{name}: {message}", file=sys.stderr)
    raise SystemExit(1)

ARTIFACT_DIR = None

def write_artifact(filename, value):
    """Write one audit artifact without sharing a default path across runs."""
    global ARTIFACT_DIR
    if ARTIFACT_DIR is None:
        if CLI_ARGS.out_dir:
            ARTIFACT_DIR = os.path.abspath(CLI_ARGS.out_dir)
            os.makedirs(ARTIFACT_DIR, exist_ok=True)
        else:
            ARTIFACT_DIR = tempfile.mkdtemp(prefix="atlassian-api-gap-")
    artifact_path = os.path.join(ARTIFACT_DIR, filename)
    with open(artifact_path, "w", encoding="utf-8") as artifact_file:
        json.dump(value, artifact_file, indent=2)

def load_spec(name, expected_server_scope):
    spec_path = os.path.join(os.path.abspath(CLI_ARGS.spec_dir), SPEC_FILES[name])
    with open(spec_path, encoding="utf-8") as spec_file:
        spec = json.load(spec_file)

    info = spec.get("info") if isinstance(spec, dict) else None
    if (
        not isinstance(spec, dict)
        or not isinstance(spec.get("openapi"), str)
        or not re.fullmatch(r"3\.(?:0|1)(?:\.\d+)?", spec["openapi"])
        or not isinstance(info, dict)
        or not isinstance(info.get("title"), str)
        or not info["title"].strip()
        or not isinstance(info.get("version"), str)
        or not info["version"].strip()
    ):
        fail_spec(
            name,
            "invalid OpenAPI document: expected OpenAPI 3.0 or 3.1 info metadata",
        )

    def validate_servers(servers):
        if not isinstance(servers, list) or not servers:
            fail_spec(name, "invalid OpenAPI document: expected a non-empty server URL")
        for server in servers:
            if (
                not isinstance(server, dict)
                or not isinstance(server.get("url"), str)
                or not server["url"].strip()
            ):
                fail_spec(name, "invalid OpenAPI document: expected a non-empty server URL")
            server_url = urlsplit(server["url"])
            if server_url.scheme not in {"http", "https"} or not server_url.netloc:
                fail_spec(
                    name,
                    "invalid OpenAPI document: expected an absolute HTTP(S) server URL",
                )
            server_scope = server_url.path.rstrip("/")
            if server_scope == "/":
                server_scope = ""
            if server_scope != expected_server_scope:
                fail_spec(
                    name,
                    f"server scope {server_scope or '/'} does not match expected "
                    f"{expected_server_scope or '/'}",
                )

    validate_servers(spec.get("servers"))
    server_scope = expected_server_scope

    def resolve_local_pointer(reference):
        if not isinstance(reference, str) or not reference.startswith("#/"):
            return None
        target = spec
        for raw_token in reference[2:].split("/"):
            token = raw_token.replace("~1", "/").replace("~0", "~")
            if isinstance(target, dict) and token in target:
                target = target[token]
            elif isinstance(target, list) and token.isdigit() and int(token) < len(target):
                target = target[int(token)]
            else:
                return None
        return target

    def valid_response_object(response, seen=None):
        if not isinstance(response, dict):
            return False
        if "$ref" in response:
            reference = response.get("$ref")
            if not isinstance(reference, str) or not reference.strip():
                return False
            seen = set() if seen is None else seen
            if reference in seen:
                return False
            target = resolve_local_pointer(reference)
            return valid_response_object(target, seen | {reference})
        return (
            isinstance(response.get("description"), str)
            and bool(response["description"].strip())
        )

    paths = spec.get("paths")
    if not isinstance(paths, dict) or not paths:
        fail_spec(name, "invalid OpenAPI document: expected non-empty paths")
    ops = []
    for p, item in paths.items():
        if not isinstance(p, str) or not p.startswith("/") or not isinstance(item, dict):
            fail_spec(name, "invalid OpenAPI document: malformed path item")
        for field in item:
            if field.lower().startswith("x-"):
                continue
            normalized_field = field.lower() if isinstance(field, str) else field
            if normalized_field not in PATH_ITEM_FIELDS:
                fail_spec(
                    name,
                    f"unsupported OpenAPI Path Item field {field} at {p}",
                )
        if "$ref" in item:
            fail_spec(name, f"unsupported OpenAPI Path Item $ref at {p}")
        if "servers" in item:
            validate_servers(item["servers"])
        for verb, op in item.items():
            if verb.lower() not in HTTP_METHODS:
                continue
            if not isinstance(op, dict):
                fail_spec(name, "invalid OpenAPI document: malformed operation")
            responses = op.get("responses")
            if not isinstance(responses, dict) or not responses:
                fail_spec(
                    name,
                    f"invalid OpenAPI operation {verb.upper()} {p}: "
                    "expected non-empty responses",
                )
            response_entries = [
                response_code
                for response_code in responses
                if not response_code.startswith("x-")
            ]
            if not response_entries:
                fail_spec(
                    name,
                    f"invalid OpenAPI operation {verb.upper()} {p}: "
                    "expected at least one response entry",
                )
            for response_code, response in responses.items():
                if response_code.startswith("x-"):
                    continue
                valid_code = response_code == "default" or re.fullmatch(
                    r"[1-5](?:\d{2}|XX)", response_code
                )
                valid_response = valid_response_object(response)
                if not valid_code or not valid_response:
                    fail_spec(
                        name,
                        f"invalid OpenAPI response {response_code} for "
                        f"{verb.upper()} {p}",
                    )
            if "deprecated" in op and not isinstance(op["deprecated"], bool):
                fail_spec(
                    name,
                    f"invalid OpenAPI operation {verb.upper()} {p}: "
                    "deprecated must be boolean",
                )
            if "servers" in op:
                validate_servers(op["servers"])
            full = server_scope + p
            ops.append({"path": p, "verb": verb.upper(), "norm": norm(full),
                        "operationId": op.get("operationId",""), "summary": op.get("summary",""),
                        "deprecated": bool(op.get("deprecated"))})
    if not ops:
        fail_spec(name, "invalid OpenAPI document: expected at least one operation")
    return ops

jira_res, jira_unk, jira_vars = extract("jira")
conf_res, conf_unk, conf_vars = extract("confluence")
all_res = jira_res + conf_res
if jira_unk or conf_unk:
    print(f"!!! UNRESOLVED ({len(jira_unk)+len(conf_unk)}) !!!")
    for u in (jira_unk+conf_unk)[:60]: print("   ", u)
    print()

# Completeness counts resolved operation paths rather than raw transport calls:
# one delegated helper transport call can fan out to several concrete endpoints.
print(f"=== completeness: jira {len(jira_res)}/{len(jira_res)+len(jira_unk)} paths | conf {len(conf_res)}/{len(conf_res)+len(conf_unk)} paths ===")

impl = {}
for r in all_res: impl.setdefault((r["verb"], r["norm_full"]), []).append(r["file"])
matched = set()
specs = {
    name: load_spec(name, expected_server_scope)
    for name, expected_server_scope in EXPECTED_SERVER_SCOPES.items()
}
out = {}
live_gap_count = 0
print("\n=== GAP DIFF ===")
for name, ops in specs.items():
    missing=[]
    for o in ops:
        k=(o["verb"], o["norm"])
        if k in impl: matched.add(k)
        else: missing.append(o)
    live=[m for m in missing if not m["deprecated"]]; dep=[m for m in missing if m["deprecated"]]
    live_gap_count += len(live)
    print(f"  {name}: {len(ops)} ops | impl {len(ops)-len(missing)} | MISSING {len(missing)} (live {len(live)}, dep {len(dep)})")
    out[name]=[{"verb":m["verb"],"path":m["path"],"operationId":m["operationId"],
                "summary":m["summary"],"deprecated":m["deprecated"],"norm":m["norm"]}
               for m in sorted(missing,key=lambda x:(x["deprecated"],x["path"]))]
write_artifact("gap_candidates.json", out)
print(f"\ntotal candidates: {sum(len(v) for v in out.values())}")
# unmatched SDK paths
unm={}
for r in all_res:
    if (r["verb"], r["norm_full"]) not in matched:
        unm.setdefault(r["prefix"],set()).add((r["verb"], r["suffix"]))
print("\n=== SDK paths matching NO spec op ===")
out_of_scope = {}
if "v1BaseUrl" in conf_vars:
    # Attachment upload intentionally uses the only supported write endpoint,
    # which still lives in REST v1 and is outside the reviewed v2 spec surface.
    out_of_scope[
        (
            conf_vars["v1BaseUrl"],
            "POST",
            "/content/{}/child/attachment",
        )
    ] = "confluence-v1 attachment upload"
for p,s in sorted(unm.items(), key=lambda x:-len(x[1])):
    reviewed = {
        out_of_scope[(p, verb, suffix)]
        for verb, suffix in s
        if (p, verb, suffix) in out_of_scope
    }
    classification = (
        f" [{next(iter(reviewed))} — out of reviewed spec scope]"
        if len(reviewed) == 1 and len(s) == 1
        else ""
    )
    print(f"  {len(s):3} {p}{classification}")
write_artifact(
    "unmatched_sdk.json",
    {p:sorted(list(s)) for p,s in unm.items()},
)
print(f"\nartifacts: {ARTIFACT_DIR}")

unexpected_sdk_routes = sum(
    1
    for prefix, routes in unm.items()
    for verb, suffix in routes
    if (prefix, verb, suffix) not in out_of_scope
)
if jira_unk or conf_unk or live_gap_count or unexpected_sdk_routes:
    raise SystemExit(1)
