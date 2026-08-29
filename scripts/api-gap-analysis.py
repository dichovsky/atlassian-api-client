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

def split_top_commas(s):
    parts, depth, cur = [], 0, ""
    opens, closes = set("({["), set(")}]")
    for c in s:
        if c in opens: depth += 1
        elif c in closes: depth -= 1
        if c == "," and depth == 0: parts.append(cur); cur = ""
        else: cur += c
    if cur.strip(): parts.append(cur)
    return [p.strip() for p in parts]

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
                mask(code_chars, i, i + 2)
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

    return "".join(chars), "".join(code_chars)

def strip_comment_only_lines(s):
    """Remove standalone // comments before parsing object-literal fields.

    Request objects often document a query/path encoding choice immediately
    above the corresponding property. Keeping that comment attached to the
    comma-delimited field prevents the anchored `path:` matcher from seeing the
    property (for example the sprint issue `fields` comment).
    """
    return re.sub(r"(?m)^[ \t]*//[^\n]*(?:\n|$)", "", s)

def parse_object_literal(arg, varmap):
    out = {}
    body = arg[arg.index("{")+1: arg.rindex("}")]
    for field in split_top_commas(body):
        m = re.match(r"([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)", field)
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
            initializers[m.group(1)] = client_src[start:end]

    resolved = {}
    pending = dict(initializers)
    while pending:
        progressed = False
        for name, expr in list(pending.items()):
            candidates = set(re.findall(r"`\$\{resolved\.baseUrl\}([^`]*)`", expr))
            alias_expr = re.sub(r"`[^`]*`", "", expr)
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
    wiring = {}
    for m in re.finditer(r"new\s+([A-Z][A-Za-z0-9]*Resource)\s*\(", client_code):
        op = client_code.index("(", m.end()-1)
        end = match_close(client_code, op, "(", ")")
        args = split_top_commas(client_src[op+1:end-1])
        base_args = []
        for a in args[1:]:
            a = a.strip()
            if a in varmap: base_args.append(varmap[a])
            elif a.startswith("{"): base_args.append(parse_object_literal(a, varmap))
            else: base_args.append(("UNKNOWN", a))
        wiring[m.group(1)] = base_args
    return wiring

def parse_ctor_params(src):
    m = re.search(r"constructor\s*\(", src)
    if not m: return []
    op = src.index("(", m.end()-1)
    end = match_close(src, op, "(", ")")
    names = []
    for p in split_top_commas(src[op+1:end-1]):
        pm = re.search(r"([A-Za-z0-9_]+)\s*[?:]", p)
        if pm: names.append(pm.group(1))
    return names[1:] if names else []

def norm(path_tmpl):
    path_tmpl = path_tmpl.split("?")[0]
    s = re.sub(r"\$\{[^}]*\}", "{}", path_tmpl)
    s = re.sub(r"\{[^}]*\}", "{}", s)
    s = re.sub(r"//+", "/", s)
    if s != "/" and s.endswith("/"): s = s[:-1]
    return s

def first_template(expr):
    """First backtick template literal in expr, or None."""
    m = re.search(r"`([^`]*)`", expr)
    return m.group(1) if m else None

def resolve_path_expr(expr, ctx, definitions=None):
    """Resolve a path expression to a template string. Handles inline templates,
    helper-wrapped templates, and local `const x = ...` variable references
    (tracing through helper-call arguments like buildFoo(basePath, params)).

    `definitions` is the complete resource source. It is needed when a request
    calls a path-building class method declared after the call site, such as
    `this.buildListPath(params)`.
    """
    expr = expr.strip()
    tpl = first_template(expr)
    if tpl: return tpl

    def class_helper_template(call_expr):
        helper_call = re.match(r"this\.([A-Za-z_][A-Za-z0-9_]*)\s*\(", call_expr.strip())
        if not helper_call or not definitions: return None
        span = method_body_span(definitions, helper_call.group(1))
        if not span: return None
        body = definitions[span[0]:span[1]]
        for ret in re.finditer(r"\breturn\s+(.+?);", body, re.S):
            helper_tpl = first_template(ret.group(1))
            if helper_tpl: return helper_tpl
        # Some helpers assign the concrete base path to a local and return it
        # through an object shorthand (`return { path, query }`).
        return first_template(body)

    # Resolve direct class path-helper calls through the helper's return value.
    # The helper may be declared below the request, hence the separate complete
    # `definitions` source rather than only the call-site context.
    tpl = class_helper_template(expr)
    if tpl: return tpl

    # gather candidate identifiers in order; try each that has a local def
    def try_idents(s, seen, depth):
        if depth > 6: return None
        for idm in re.finditer(r"[A-Za-z_][A-Za-z0-9_]*", s):
            ident = idm.group(0)
            if ident in seen: continue
            assignments = [
                (m.start(), m.group(1))
                for m in re.finditer(
                    r"(?:const|let)\s+"+re.escape(ident)+r"\s*=\s*([^;]+);",
                    ctx,
                    re.S,
                )
            ]
            # Path/query helpers conventionally return an object which callers
            # immediately destructure. Treat the RHS as the local definition of
            # `path`; choosing the latest assignment keeps resolution scoped to
            # the closest call site instead of an earlier method's `path` local.
            for m in re.finditer(r"(?:const|let)\s*\{([^}]*)\}\s*=\s*([^;]+);", ctx, re.S):
                names = {part.strip().split(":", 1)[-1].strip() for part in m.group(1).split(",")}
                if ident in names:
                    assignments.append((m.start(), m.group(2)))
            for _, rhs in sorted(assignments, reverse=True):
                seen2 = seen | {ident}
                t = first_template(rhs)
                if t: return t
                t = class_helper_template(rhs)
                if t: return t
                t = try_idents(rhs, seen2, depth+1)
                if t: return t
        return None
    return try_idents(expr, set(), 0)

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

def method_body_span(src, name):
    """Return the body span of a class method, if present."""
    m = re.search(
        r"(?m)^\s*(?:(?:private|protected|public)\s+)?(?:async\s+)?"+re.escape(name)+r"\s*\(",
        src,
    )
    if not m: return None
    op = src.index("(", m.start())
    params_end = match_close(src, op, "(", ")")
    if params_end == -1: return None
    body_start = src.find("{", params_end)
    if body_start == -1: return None
    body_end = match_close(src, body_start, "{", "}")
    return (body_start, body_end) if body_end != -1 else None

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
        params = parse_ctor_params(src)
        wargs = wiring.get(cls, [])
        fieldmap = {params[i]: wargs[i] for i in range(min(len(params), len(wargs)))}
        helper = {}
        if "agileBaseUrl" in fieldmap: helper["requireAgileBaseUrl"] = fieldmap["agileBaseUrl"]
        dict_field = next((k for k, v in fieldmap.items() if isinstance(v, dict)), None)
        if dict_field: helper["requireDevopsBaseUrls"] = fieldmap[dict_field]

        # A helper-backed request represents one operation for every concrete
        # call-site path. Expand those paths before scanning direct transport
        # calls, and skip the helper's own variable `finalPath` request.
        delegated_spans = []
        for helper_name, helper_verb in {"requestSoftwareIssues": "GET"}.items():
            span = method_body_span(src, helper_name)
            calls = list(re.finditer(r"\bthis\."+re.escape(helper_name)+r"\s*\(", code_src))
            if not span or not calls: continue
            delegated_spans.append(span)
            for call in calls:
                op = src.index("(", call.start())
                end = match_close(src, op, "(", ")")
                args = split_top_commas(src[op+1:end-1]) if end != -1 else []
                if not args:
                    unknowns.append((os.path.basename(f), "no-helper-path", helper_name)); continue
                tpl = resolve_path_expr(args[0], src[:call.start()], src)
                if not tpl:
                    unknowns.append((os.path.basename(f), "unresolved-helper-path", args[0][:80])); continue
                prefix, suffix, error = resolve_template(tpl, fieldmap, helper)
                if error:
                    unknowns.append((os.path.basename(f), error, tpl[:80])); continue
                full = prefix + suffix
                results.append({"prefix": prefix, "verb": helper_verb, "suffix": norm(suffix),
                                "norm_full": norm(full), "file": os.path.basename(f)})

        for rm in re.finditer(r"this\.transport\.request", code_src):
            if any(start <= rm.start() < end for start, end in delegated_spans):
                continue
            op = src.index("(", rm.end())
            obj_start = src.index("{", op)
            obj_end = match_close(src, obj_start, "{", "}")
            obj = src[obj_start:obj_end]
            ctx = src[:rm.start()] + obj  # full preceding context for var resolution
            props = split_top_commas(strip_comment_only_lines(obj[1:-1]))
            verb = None; expr = None
            for p in props:
                mm = re.match(r"method:\s*'([A-Z]+)'", p)
                if mm: verb = mm.group(1)
                pp = re.match(r"path\s*:\s*(.+)", p, re.S)
                if pp: expr = pp.group(1).strip()
                elif re.fullmatch(r"path", p.strip()): expr = "path"  # shorthand
            if not verb:
                unknowns.append((os.path.basename(f), "no-method", obj[:80])); continue
            if expr is None:
                unknowns.append((os.path.basename(f), "no-path", obj[:80])); continue
            tpl = resolve_path_expr(expr, ctx, src)
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
