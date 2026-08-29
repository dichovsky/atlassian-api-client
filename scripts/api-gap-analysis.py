#!/usr/bin/env python3
"""Atlassian SDK coverage gap analysis — deterministic auto-diff.

CI coverage guard and standalone audit tool. Extracts every transport-backed
operation path+verb from src/{jira,confluence}/resources/*.ts (including
delegated helper call sites and resolving each resource's base-URL prefix from
the client wiring), normalizes path params, and diffs against the three official
Atlassian OpenAPI specs to list unimplemented operations.

Usage:
  python3 scripts/api-gap-analysis.py
  python3 scripts/api-gap-analysis.py --spec-dir /path/to/spec
  python3 scripts/api-gap-analysis.py --source-root /path/to/repository

Reads the reviewed snapshots in spec/. Refresh them using spec/README.md before a live audit.
  Writes /tmp/gap_candidates.json + /tmp/unmatched_sdk.json.

Candidates are starting points only — each must be verified against the spec +
BACKLOG-ARCHIVE.md before being treated as a real gap (the diff cannot tell an
alternate-prefix duplicate or a deprecated-superseded alias from a true gap).
"""
import argparse, json, re, os, glob

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
CLI_ARGS = PARSER.parse_args()

SPEC_FILES = {
    "jira-platform": "jira-platform-v3.json",
    "jira-software": "jira-software.json",
    "confluence-v2": "confluence-v2.json",
}

SPEC_PREFIXES = {
    "jira-platform": "/rest/api/3",
    "jira-software": "/rest/agile/1.0",
    "confluence-v2": "/wiki/api/v2",
}

def match_close(s, start, op, cl):
    depth = 0
    for i in range(start, len(s)):
        if s[i] == op: depth += 1
        elif s[i] == cl:
            depth -= 1
            if depth == 0: return i + 1
    return -1

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
        end = previous + 1
        while previous >= 0 and (code_chars[previous].isalnum() or code_chars[previous] in "_$"):
            previous -= 1
        keyword = "".join(code_chars[previous + 1:end])
        return keyword in {
            "await", "case", "delete", "do", "else", "in", "instanceof",
            "of", "return", "throw", "typeof", "void", "yield",
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
    for m in re.finditer(
        r"\bconst\s+((?:baseUrl)|(?:[A-Za-z0-9_]+BaseUrl))\s*(?::[^=]+)?=",
        client_code,
    ):
        start = m.end()
        while start < len(client_src) and client_src[start].isspace():
            start += 1
        end = client_code.find(";", start)
        if end != -1:
            initializers[m.group(1)] = (
                client_src[start:end],
                client_code[start:end],
            )

    resolved = {}
    pending = dict(initializers)
    while pending:
        progressed = False
        for name, (expr, expr_code) in list(pending.items()):
            candidates = {
                match.group(1)[len("${resolved.baseUrl}"):]
                for match in executable_template_matches(expr, expr_code)
                if match.group(1).startswith("${resolved.baseUrl}")
            }
            alias_chars = list(expr_code)
            for match in executable_template_matches(expr, expr_code):
                for index in range(match.start(), match.end()):
                    if alias_chars[index] not in {"\n", "\r"}:
                        alias_chars[index] = " "
            alias_expr = "".join(alias_chars)
            for ident in re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", alias_expr):
                if ident in resolved:
                    candidates.add(resolved[ident])
            if len(candidates) == 1:
                resolved[name] = candidates.pop()
                del pending[name]
                progressed = True
        if not progressed:
            break
    return resolved

def parse_wiring(client_src, client_code, varmap):
    assert len(client_src) == len(client_code), "source/code views must stay aligned"
    wiring = {}
    for m in re.finditer(r"new\s+([A-Z][A-Za-z0-9]*Resource)\s*\(", client_code):
        op = client_code.index("(", m.end()-1)
        end = match_close(client_code, op, "(", ")")
        args = split_top_commas_aligned(
            client_src[op+1:end-1],
            client_code[op+1:end-1],
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
        wiring[m.group(1)] = base_args
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
    path_tmpl = path_tmpl.split("?")[0]
    s = re.sub(r"\$\{[^}]*\}", "{}", path_tmpl)
    s = re.sub(r"\{[^}]*\}", "{}", s)
    s = re.sub(r"//+", "/", s)
    if s != "/" and s.endswith("/"): s = s[:-1]
    return s

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
    tpl = first_template(expr, expr_code)
    if tpl: return tpl

    def class_helper_template(call_expr, call_code):
        helper_call = re.match(r"this\.([A-Za-z_][A-Za-z0-9_]*)\s*\(", call_code.strip())
        if not helper_call or not definitions or not definitions_code: return None
        span = method_body_span(definitions, helper_call.group(1), definitions_code)
        if not span: return None
        body = definitions[span[0]:span[1]]
        body_code = definitions_code[span[0]:span[1]]
        for ret in re.finditer(r"\breturn\b", body_code):
            value_start = ret.end()
            value_end = find_statement_end(body_code, value_start)
            if value_end == -1: continue
            value = body[value_start:value_end]
            value_code = body_code[value_start:value_end]
            helper_tpl = first_template(value, value_code)
            if helper_tpl: return helper_tpl
            helper_tpl = try_idents(
                value,
                value_code,
                body[:ret.start()],
                body_code[:ret.start()],
                set(),
                0,
            )
            if helper_tpl: return helper_tpl
        return None

    # gather candidate identifiers in order; try each that has a local def
    def try_idents(s, code_s, local_ctx, local_code, seen, depth):
        if depth > 6: return None
        for idm in re.finditer(r"[A-Za-z_][A-Za-z0-9_]*", code_s):
            ident = idm.group(0)
            if ident in seen: continue
            assignments = []
            declaration = re.compile(
                r"\b(?:const|let)\s+"+re.escape(ident)+r"\s*(?::[^=;]+)?="
            )
            for assignment in declaration.finditer(local_code):
                value_start = assignment.end()
                value_end = find_statement_end(local_code, value_start)
                if value_end != -1:
                    assignments.append(
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
                        assignments.append(
                            (
                                assignment.start(),
                                local_ctx[value_start:value_end],
                                local_code[value_start:value_end],
                            )
                        )
            for _, rhs, rhs_code in sorted(assignments, reverse=True):
                seen2 = seen | {ident}
                t = first_template(rhs, rhs_code)
                if t: return t
                t = class_helper_template(rhs, rhs_code)
                if t: return t
                t = try_idents(rhs, rhs_code, local_ctx, local_code, seen2, depth+1)
                if t: return t
        return None

    # Resolve direct class path-helper calls through the helper's return value.
    # The helper may be declared below the request, hence the separate complete
    # definitions source rather than only the call-site context.
    tpl = class_helper_template(expr, expr_code)
    if tpl: return tpl
    return try_idents(expr, expr_code, ctx, ctx_code, set(), 0)

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
    """Return the body span of a class method, if present."""
    scan = code_src if code_src is not None else src
    m = re.search(
        r"(?m)^\s*(?:(?:private|protected|public)\s+)?(?:async\s+)?"+re.escape(name)+r"\s*\(",
        scan,
    )
    if not m: return None
    op = scan.index("(", m.start())
    params_end = match_close(scan, op, "(", ")")
    if params_end == -1: return None
    body_start = scan.find("{", params_end)
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

def extract(api):
    source_root = os.path.abspath(CLI_ARGS.source_root)
    res_dir = os.path.join(source_root, "src", api, "resources")
    client_src, client_code = lex_ts_source(
        open(os.path.join(source_root, "src", api, "client.ts")).read()
    )
    varmap = parse_base_suffixes(client_src, client_code)
    wiring = parse_wiring(client_src, client_code, varmap)
    results, unknowns = [], []
    for f in sorted(glob.glob(os.path.join(res_dir, "*.ts"))):
        if f.endswith("index.ts"): continue
        src, code_src = lex_ts_source(open(f).read())
        clsm = re.search(r"export\s+class\s+([A-Z][A-Za-z0-9]*Resource)", code_src)
        if not clsm: continue
        cls = clsm.group(1)
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
        request_calls = list(re.finditer(r"this\.transport\.request", code_src))
        scope_starts = enclosing_method_scope_starts(
            code_src,
            [
                call.start()
                for calls in helper_calls.values()
                for call in calls
            ] + [call.start() for call in request_calls],
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

        for rm in request_calls:
            if any(start <= rm.start() < end for start, end in delegated_spans):
                continue
            op = code_src.index("(", rm.end())
            obj_start = code_src.index("{", op)
            obj_end = match_close(code_src, obj_start, "{", "}")
            obj = src[obj_start:obj_end]
            obj_code = code_src[obj_start:obj_end]
            scope_start = scope_starts[rm.start()]
            ctx = src[scope_start:rm.start()] + obj
            ctx_code = code_src[scope_start:rm.start()] + obj_code
            props = split_top_commas_aligned(obj[1:-1], obj_code[1:-1])
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
    return results, unknowns, varmap

def load_spec(name, pref):
    spec_path = os.path.join(os.path.abspath(CLI_ARGS.spec_dir), SPEC_FILES[name])
    with open(spec_path, encoding="utf-8") as spec_file:
        spec = json.load(spec_file)
    ops = []
    for p, item in spec.get("paths", {}).items():
        for verb, op in item.items():
            if verb.lower() not in {"get","post","put","delete","patch"} or not isinstance(op, dict): continue
            full = p if p.startswith("/rest") else pref + p
            ops.append({"path": p, "verb": verb.upper(), "norm": norm(full),
                        "operationId": op.get("operationId",""), "summary": op.get("summary",""),
                        "deprecated": bool(op.get("deprecated"))})
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
specs = {name: load_spec(name, prefix) for name, prefix in SPEC_PREFIXES.items()}
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
json.dump(out, open("/tmp/gap_candidates.json","w"), indent=2)
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
    out_of_scope[conf_vars["v1BaseUrl"]] = "confluence-v1 attachment upload"
for p,s in sorted(unm.items(), key=lambda x:-len(x[1])):
    classification = f" [{out_of_scope[p]} — out of reviewed spec scope]" if p in out_of_scope else ""
    print(f"  {len(s):3} {p}{classification}")
json.dump({p:sorted(list(s)) for p,s in unm.items()}, open("/tmp/unmatched_sdk.json","w"), indent=2)

if jira_unk or conf_unk or live_gap_count:
    raise SystemExit(1)
