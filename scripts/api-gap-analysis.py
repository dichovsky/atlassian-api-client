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
CLI_ARGS = PARSER.parse_args()

SPEC_FILES = {
    "jira-platform": "jira-platform-v3.json",
    "jira-software": "jira-software.json",
    "confluence-v2": "confluence-v2.json",
}

JIRA_VARS = {
    "baseUrl": "/rest/api/3", "agileBaseUrl": "/rest/agile/1.0",
    "softwareBaseUrl": "/rest/software/1.0",
    "operationsBaseUrl": "/rest/operations/1.0", "securityBaseUrl": "/rest/security/1.0",
    "devopscomponentsBaseUrl": "/rest/devopscomponents/1.0", "featureFlagsBaseUrl": "/rest/featureflags/0.1",
    "latestBaseUrl": "/rest/internal/api/latest", "remoteLinkBaseUrl": "/rest/remotelinks/1.0",
    "serviceRegistryBaseUrl": "/rest/atlassian-connect/1", "devInfoBaseUrl": "/rest/devinfo/0.10",
    "forgeBaseUrl": "/rest/forge/1", "buildsBaseUrl": "/rest/builds/0.1",
    "deploymentsBaseUrl": "/rest/deployments/0.1",
}
CONF_VARS = {
    "baseUrl": "/wiki/api/v2",
    # Attachment upload intentionally uses the only supported write endpoint,
    # which still lives in REST v1. Resolve it so it does not look like an AST
    # extraction failure, while leaving it outside the v2 comparison surface.
    "v1BaseUrl": "/wiki/rest/api",
}
IN_SCOPE = {"/rest/api/3": "jira-platform", "/rest/agile/1.0": "jira-software",
            "/rest/software/1.0": "jira-software",
            "/wiki/api/v2": "confluence-v2"}
OUT_OF_SCOPE = {"/wiki/rest/api": "confluence-v1 attachment upload"}

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

def parse_wiring(client_src, varmap):
    wiring = {}
    for m in re.finditer(r"new\s+([A-Z][A-Za-z0-9]*Resource)\s*\(", client_src):
        op = client_src.index("(", m.end()-1)
        end = match_close(client_src, op, "(", ")")
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
    res_dir = os.path.join(ROOT, "src", api, "resources")
    client_src = open(os.path.join(ROOT, "src", api, "client.ts")).read()
    varmap = JIRA_VARS if api == "jira" else CONF_VARS
    wiring = parse_wiring(client_src, varmap)
    results, unknowns = [], []
    for f in sorted(glob.glob(os.path.join(res_dir, "*.ts"))):
        if f.endswith("index.ts"): continue
        src = open(f).read()
        clsm = re.search(r"export\s+class\s+([A-Z][A-Za-z0-9]*Resource)", src)
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
            calls = list(re.finditer(r"\bthis\."+re.escape(helper_name)+r"\s*\(", src))
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
                results.append({"prefix": prefix, "surface": IN_SCOPE.get(prefix),
                                "verb": helper_verb, "suffix": norm(suffix),
                                "norm_full": norm(full), "file": os.path.basename(f)})

        for rm in re.finditer(r"this\.transport\.request", src):
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
            surface = IN_SCOPE.get(prefix)
            results.append({"prefix": prefix, "surface": surface, "verb": verb,
                            "suffix": norm(suffix), "norm_full": norm(full),
                            "file": os.path.basename(f)})
    return results, unknowns

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

jira_res, jira_unk = extract("jira")
conf_res, conf_unk = extract("confluence")
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
specs = {"jira-platform": load_spec("jira-platform","/rest/api/3"),
         "jira-software": load_spec("jira-software","/rest/agile/1.0"),
         "confluence-v2": load_spec("confluence-v2","/wiki/api/v2")}
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
for p,s in sorted(unm.items(), key=lambda x:-len(x[1])):
    classification = f" [{OUT_OF_SCOPE[p]} — out of reviewed spec scope]" if p in OUT_OF_SCOPE else ""
    print(f"  {len(s):3} {p}{classification}")
json.dump({p:sorted(list(s)) for p,s in unm.items()}, open("/tmp/unmatched_sdk.json","w"), indent=2)

if jira_unk or conf_unk or live_gap_count:
    raise SystemExit(1)
