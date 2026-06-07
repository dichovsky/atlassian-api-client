#!/usr/bin/env python3
"""Atlassian SDK coverage gap analysis — deterministic auto-diff.

Standalone audit tool (not wired into npm/CI). Extracts every transport.request
path+verb from src/{jira,confluence}/resources/*.ts (resolving each resource's
base-URL prefix from the client wiring), normalizes path params, and diffs against
the three official Atlassian OpenAPI specs to list unimplemented operations.

Usage:
  1. Fetch the three specs to /tmp (versions/URLs recorded in
     docs/API-GAP-ANALYSIS-*.md):
       curl -s <jira-platform-url>  -o /tmp/spec-jira-platform.json
       curl -s <jira-software-url>  -o /tmp/spec-jira-software.json
       curl -s <confluence-v2-url>  -o /tmp/spec-confluence-v2.json
  2. python3 scripts/api-gap-analysis.py
  Writes /tmp/gap_candidates.json + /tmp/unmatched_sdk.json.

Candidates are starting points only — each must be verified against the spec +
BACKLOG-ARCHIVE.md before being treated as a real gap (the diff cannot tell an
alternate-prefix duplicate or a deprecated-superseded alias from a true gap).
"""
import json, re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

JIRA_VARS = {
    "baseUrl": "/rest/api/3", "agileBaseUrl": "/rest/agile/1.0",
    "operationsBaseUrl": "/rest/operations/1.0", "securityBaseUrl": "/rest/security/1.0",
    "devopscomponentsBaseUrl": "/rest/devopscomponents/1.0", "featureFlagsBaseUrl": "/rest/featureflags/0.1",
    "latestBaseUrl": "/rest/internal/api/latest", "remoteLinkBaseUrl": "/rest/remotelinks/1.0",
    "serviceRegistryBaseUrl": "/rest/atlassian-connect/1", "devInfoBaseUrl": "/rest/devinfo/0.10",
    "forgeBaseUrl": "/rest/forge/1", "buildsBaseUrl": "/rest/builds/0.1",
    "deploymentsBaseUrl": "/rest/deployments/0.1",
}
CONF_VARS = {"baseUrl": "/wiki/api/v2"}
IN_SCOPE = {"/rest/api/3": "jira-platform", "/rest/agile/1.0": "jira-software",
            "/wiki/api/v2": "confluence-v2"}

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

def resolve_path_expr(expr, ctx):
    """Resolve a path expression to a template string. Handles inline templates,
    helper-wrapped templates, and local `const x = ...` variable references
    (tracing through helper-call arguments like buildFoo(basePath, params))."""
    expr = expr.strip()
    tpl = first_template(expr)
    if tpl: return tpl
    # gather candidate identifiers in order; try each that has a local def
    def try_idents(s, seen, depth):
        if depth > 6: return None
        for idm in re.finditer(r"[A-Za-z_][A-Za-z0-9_]*", s):
            ident = idm.group(0)
            if ident in seen: continue
            defs = list(re.finditer(r"(?:const|let)\s+"+re.escape(ident)+r"\s*=\s*([^;]+);", ctx, re.S))
            if not defs: continue
            seen2 = seen | {ident}
            rhs = defs[-1].group(1)
            t = first_template(rhs)
            if t: return t
            t = try_idents(rhs, seen2, depth+1)
            if t: return t
        return None
    return try_idents(expr, set(), 0)

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

        for rm in re.finditer(r"this\.transport\.request", src):
            op = src.index("(", rm.end())
            obj_start = src.index("{", op)
            obj_end = match_close(src, obj_start, "{", "}")
            obj = src[obj_start:obj_end]
            ctx = src[:rm.start()] + obj  # full preceding context for var resolution
            props = split_top_commas(obj[1:-1])
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
            tpl = resolve_path_expr(expr, ctx)
            if not tpl:
                unknowns.append((os.path.basename(f), "unresolved-path", expr[:80])); continue
            bt = re.match(r"\$\{([^}]*)\}", tpl)
            if not bt:
                unknowns.append((os.path.basename(f), "no-base-token", tpl[:80])); continue
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
            if prefix is None:
                unknowns.append((os.path.basename(f), "unresolved-token:"+token, tpl[:80])); continue
            full = prefix + suffix
            surface = IN_SCOPE.get(prefix)
            results.append({"prefix": prefix, "surface": surface, "verb": verb,
                            "suffix": norm(suffix), "norm_full": norm(full),
                            "file": os.path.basename(f)})
    return results, unknowns

def load_spec(name, pref):
    spec = json.load(open(f"/tmp/spec-{name}.json"))
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

# completeness
import subprocess
def reqcount(api):
    n=0
    for f in glob.glob(f"{ROOT}/src/{api}/resources/*.ts"):
        n += open(f).read().count("this.transport.request")
    return n
print(f"=== completeness: jira {len(jira_res)}/{reqcount('jira')} calls | conf {len(conf_res)}/{reqcount('confluence')} calls ===")

impl = {}
for r in all_res: impl.setdefault((r["verb"], r["norm_full"]), []).append(r["file"])
matched = set()
specs = {"jira-platform": load_spec("jira-platform","/rest/api/3"),
         "jira-software": load_spec("jira-software","/rest/agile/1.0"),
         "confluence-v2": load_spec("confluence-v2","/wiki/api/v2")}
out = {}
print("\n=== GAP DIFF ===")
for name, ops in specs.items():
    missing=[]
    for o in ops:
        k=(o["verb"], o["norm"])
        if k in impl: matched.add(k)
        else: missing.append(o)
    live=[m for m in missing if not m["deprecated"]]; dep=[m for m in missing if m["deprecated"]]
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
for p,s in sorted(unm.items(), key=lambda x:-len(x[1])): print(f"  {len(s):3} {p}")
json.dump({p:sorted(list(s)) for p,s in unm.items()}, open("/tmp/unmatched_sdk.json","w"), indent=2)
