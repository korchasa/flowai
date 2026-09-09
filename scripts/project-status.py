#!/usr/bin/env python3
"""Print the current state of this project in three blocks.

1. Tasks — the open and in-progress task files, as reported by
   `scripts/tasks-overview.py` (this script only runs it and relays its output).
2. Acceptance tests — the newest cached verdict per scenario from
   `acceptance-tests/cache/<pack>/<scenario>/<ide>.json`, plus the scenarios
   that took part in the latest run (`acceptance-tests/runs/latest`).
3. Benchmarks — per result cell under `scripts/benchmark/cells/`, resolved
   versus measured instances per rep (the same numbers as
   `deno task benchmark cells-show`, computed here without Deno).

Usage:
    python3 scripts/project-status.py            # all three blocks
    python3 scripts/project-status.py --failing  # acceptance block lists only red scenarios (default lists all)
    python3 scripts/project-status.py --top N    # limit the task list to N entries per status (default 10)

Exit codes: 0 — printed; 2 — a data directory is missing or a file could not be
parsed (the message names the path). Stdlib only.
"""

import argparse
import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TASKS_SCRIPT = ROOT / "scripts" / "tasks-overview.py"
CACHE_ROOT = ROOT / "acceptance-tests" / "cache"
RUNS_ROOT = ROOT / "acceptance-tests" / "runs"
CELLS_ROOT = ROOT / "scripts" / "benchmark" / "cells"


def fail(message):
    print(f"project-status: {message}", file=sys.stderr)
    sys.exit(2)


def heading(title):
    print(title)
    print("=" * len(title))


# ---------------------------------------------------------------- tasks


def block_tasks(top):
    heading("Tasks")
    if not TASKS_SCRIPT.is_file():
        fail(f"missing {TASKS_SCRIPT.relative_to(ROOT)}")
    proc = subprocess.run(
        [sys.executable, str(TASKS_SCRIPT)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        fail(f"tasks-overview exited {proc.returncode}: {proc.stderr.strip()}")
    # The overview groups tasks under "<status> (N)" headings; keep at most
    # `top` entries per group so a long backlog does not drown the summary.
    kept = 0
    for line in proc.stdout.splitlines():
        if line.startswith("  "):
            kept += 1
            if kept > top:
                if kept == top + 1:
                    print("  ...")
                continue
        else:
            kept = 0
        print(line)
    print()


# ----------------------------------------------------------- acceptance


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        fail(f"cannot read {path.relative_to(ROOT)}: {exc}")


def block_acceptance(failing_only):
    heading("Acceptance tests (newest cached verdict per scenario)")
    if not CACHE_ROOT.is_dir():
        fail(f"missing {CACHE_ROOT.relative_to(ROOT)}")
    newest = {}  # (pack, scenario) -> entry
    for path in sorted(CACHE_ROOT.glob("*/*/*.json")):
        entry = load_json(path)
        key = (path.parent.parent.name, path.parent.name)
        stamp = entry.get("recordedAt", "")
        if key not in newest or stamp > newest[key]["recordedAt"]:
            newest[key] = entry
    if not newest:
        print("  no cached results")
        print()
        return

    per_pack = defaultdict(lambda: {"pass": 0, "fail": 0, "rows": []})
    for (pack, scenario), entry in sorted(newest.items()):
        result = entry.get("result", {})
        # success is the runner's own verdict (critical items only); a failed
        # non-critical item is a warning, not a red scenario.
        ok = bool(result.get("success"))
        stats = per_pack[pack]
        stats["pass" if ok else "fail"] += 1
        failed_items = [
            name
            for name, item in result.get("checklistResults", {}).items()
            if not item.get("pass")
        ]
        stats["rows"].append((ok, scenario, entry, result, failed_items))

    total_pass = sum(s["pass"] for s in per_pack.values())
    total_fail = sum(s["fail"] for s in per_pack.values())
    print(f"  {total_pass} pass, {total_fail} fail across {len(newest)} scenarios")
    stamps = sorted(e["recordedAt"] for e in newest.values())
    print(f"  recorded between {stamps[0][:10]} and {stamps[-1][:10]}")
    print()
    for pack, stats in sorted(per_pack.items()):
        print(f"  {pack}: {stats['pass']} pass, {stats['fail']} fail")
        for ok, scenario, entry, result, failed_items in stats["rows"]:
            if failing_only and ok and not failed_items:
                continue
            mark = "FAIL" if not ok else ("WARN" if failed_items else "PASS")
            line = (
                f"    {mark} {scenario}  score={round(result.get('score', 0))}"
                f"  {entry.get('ide', '?')}/{entry.get('agentModel', '?')}"
                f"  {entry.get('recordedAt', '')[:10]}"
            )
            if failed_items:
                label = "failed" if not ok else "warnings"
                line += f"  {label}: {', '.join(failed_items)}"
            print(line)
    print()

    latest = RUNS_ROOT / "latest"
    if latest.is_dir():
        target = latest.resolve()
        scenarios = sorted(p.name for p in target.iterdir() if p.is_dir())
        print(f"  latest run: {target.name} ({len(scenarios)} scenarios)")
        for name in scenarios:
            print(f"    {name}")
    else:
        print("  latest run: none")
    print()


# ----------------------------------------------------------- benchmarks


def block_benchmarks():
    heading("Benchmarks (SWE-rebench result cells)")
    if not CELLS_ROOT.is_dir():
        fail(f"missing {CELLS_ROOT.relative_to(ROOT)}")
    cells = sorted(p for p in CELLS_ROOT.iterdir() if p.is_dir())
    if not cells:
        print("  no result cells")
        print()
        return
    for cell_dir in cells:
        header = load_json(cell_dir / "cell.json")
        key = header.get("key", {})
        tasks_path = cell_dir / "tasks.jsonl"
        rows = {}  # (rep, instance) -> row, later rows win
        if tasks_path.is_file():
            for number, raw in enumerate(tasks_path.read_text(encoding="utf-8").splitlines(), 1):
                if not raw.strip():
                    continue
                try:
                    row = json.loads(raw)
                except ValueError as exc:
                    fail(f"{tasks_path.relative_to(ROOT)}:{number}: {exc}")
                rows[(row.get("rep"), row.get("instanceId"))] = row
        reps = defaultdict(lambda: {"measured": 0, "resolved": 0, "pending": 0})
        for (rep, _), row in rows.items():
            stats = reps[rep]
            if row.get("status") == "measured":
                stats["measured"] += 1
            if row.get("status") == "pending":
                stats["pending"] += 1
            if (row.get("verdict") or {}).get("resolved"):
                stats["resolved"] += 1
        finished = [r.get("finishedAt", "") for r in header.get("reps", [])]
        last = max(finished)[:10] if finished else "?"
        arm = key.get("arm", "?")
        fw = key.get("framework") or "-"
        print(
            f"  {arm} ({key.get('ide', '?')} {key.get('model', '?')}/{key.get('effort', '?')},"
            f" framework {fw}, last rep {last})"
        )
        total_resolved = total_measured = 0
        for rep in sorted(reps):
            stats = reps[rep]
            total_resolved += stats["resolved"]
            total_measured += stats["measured"]
            extra = f" (+{stats['pending']} pending)" if stats["pending"] else ""
            print(f"    rep{rep}: {stats['resolved']}/{stats['measured']} resolved{extra}")
        if total_measured:
            rate = 100.0 * total_resolved / total_measured
            print(f"    overall: {total_resolved}/{total_measured} = {rate:.1f}%")
        print(f"    cell: {cell_dir.name}")
    print()


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--failing", action="store_true", help="list only red scenarios and green ones with warnings")
    parser.add_argument("--top", type=int, default=10, help="tasks shown per status group")
    args = parser.parse_args()
    print(f"Project status — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print()
    block_tasks(args.top)
    block_acceptance(args.failing)
    block_benchmarks()


if __name__ == "__main__":
    main()
