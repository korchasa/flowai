#!/usr/bin/env python3
"""List AI IDE sessions for a given IDE, as absolute paths.

Supports three of the IDEs flowai targets: Claude Code, OpenAI Codex, OpenCode.
Filters out sessions below a size threshold and sessions already recorded in the
YAML error index. Stdlib only — no third-party deps.

Output: one absolute path per line, largest session first.
With --json: one JSON object per session ({ide, path, size_bytes}).

Session identity per IDE:
- claude   : absolute path to the session `*.jsonl` file.
- codex    : absolute path to the `rollout-*.jsonl` file.
- opencode : absolute path to the `storage/message/ses_<id>/` directory;
             size = message JSON bytes + their `part/<msg_id>/` bytes.

"Already analyzed" = every `id:` scalar found in the YAML index file. Ids in
the index are unique absolute paths, so a plain scan of `id:` keys is sufficient
and avoids a YAML parser dependency.
"""

import argparse
import json
import re
import signal
import sys
from pathlib import Path

# Die quietly on SIGPIPE (e.g. `… | head`) instead of dumping a BrokenPipeError.
if hasattr(signal, "SIGPIPE"):
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)

DEFAULT_MIN_BYTES = 100 * 1024  # 100 KiB — matches the skill's "substantive" cutoff
DEFAULT_INDEX = "~/.claude/session-analysis/llm-session-errors-index.yaml"

# Matches a YAML `id:` or `- id:` line; captures the (optionally quoted) value.
_ID_LINE = re.compile(r'^\s*-?\s*id:\s*["\']?(.+?)["\']?\s*$')


def load_analyzed(index_path: Path) -> set[str]:
    """Return the set of session ids already recorded in the YAML index."""
    if not index_path.exists():
        return set()
    analyzed: set[str] = set()
    for line in index_path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = _ID_LINE.match(line)
        if m:
            analyzed.add(m.group(1).strip())
    return analyzed


def _tree_size(path: Path) -> int:
    """Total bytes of a file, or recursive total of a directory. 0 if missing."""
    if path.is_file():
        return path.stat().st_size
    if path.is_dir():
        return sum(p.stat().st_size for p in path.rglob("*") if p.is_file())
    return 0


def list_claude() -> list[tuple[str, int]]:
    root = Path.home() / ".claude" / "projects"
    return [(str(f.resolve()), f.stat().st_size) for f in root.glob("*/*.jsonl")]


def list_codex() -> list[tuple[str, int]]:
    roots = [Path.home() / ".codex" / "sessions",
             Path.home() / ".codex" / "archived_sessions"]
    out = []
    for root in roots:
        if not root.exists():
            continue
        for f in root.rglob("rollout-*.jsonl"):
            out.append((str(f.resolve()), f.stat().st_size))
    return out


def list_opencode() -> list[tuple[str, int]]:
    storage = Path.home() / ".local" / "share" / "opencode" / "storage"
    msg_root = storage / "message"
    part_root = storage / "part"
    out = []
    if not msg_root.exists():
        return out
    for sess_dir in msg_root.glob("ses_*"):
        if not sess_dir.is_dir():
            continue
        total = 0
        for msg_file in sess_dir.glob("msg_*.json"):
            total += msg_file.stat().st_size
            total += _tree_size(part_root / msg_file.stem)  # parts keyed by msg id
        out.append((str(sess_dir.resolve()), total))
    return out


LISTERS = {
    "claude": list_claude,
    "codex": list_codex,
    "opencode": list_opencode,
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ide", required=True, choices=sorted(LISTERS),
                    help="which IDE's history to list")
    ap.add_argument("--min-bytes", type=int, default=DEFAULT_MIN_BYTES,
                    help=f"skip sessions smaller than this (default {DEFAULT_MIN_BYTES})")
    ap.add_argument("--index", default=DEFAULT_INDEX,
                    help="YAML error index; sessions whose id is recorded there are "
                         f"skipped (default {DEFAULT_INDEX})")
    ap.add_argument("--json", action="store_true",
                    help="emit JSON objects {ide, path, size_bytes} instead of paths")
    args = ap.parse_args()

    analyzed = load_analyzed(Path(args.index).expanduser())
    sessions = LISTERS[args.ide]()

    kept = [(sid, size) for sid, size in sessions
            if size >= args.min_bytes and sid not in analyzed]
    kept.sort(key=lambda x: x[1], reverse=True)

    for sid, size in kept:
        if args.json:
            print(json.dumps({"ide": args.ide, "path": sid, "size_bytes": size}))
        else:
            print(sid)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BrokenPipeError:
        sys.exit(0)  # downstream closed the pipe (e.g. `| head`)
