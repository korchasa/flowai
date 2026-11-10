#!/usr/bin/env python3
"""Counts how often each flowai framework skill was loaded into a Claude Code session.

A load is the record Claude Code writes when it puts a skill body into the context: a user-type
record whose text starts with "Base directory for this skill: <dir>". It appears once per load,
whether the model called the Skill tool or the user typed the slash command, and its directory
says which pack, which build and which skill. Text that merely mentions the marker (a command, a
tool result, a quoted transcript) is not a load, so records are parsed, never grepped.

    flowai-skill-reads.py [--days D] [--config-root DIR ...] [--json]

Reads the transcripts under <config-root>/projects of every root (default: ~/.claude and
~/.claude-work). The skill catalogue is the local plugin build, dist/claude-plugins/plugins.
Python 3, stdlib only. Exit 2: the catalogue or a config root is missing.
"""

import argparse
import collections
import datetime
import json
import os
import re
import sys

MARKER = "Base directory for this skill: "
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGUE = os.path.join(REPO, "dist", "claude-plugins", "plugins")
DEFAULT_ROOTS = ["~/.claude", "~/.claude-work"]
# <...>/plugins/<pack>/skills/<name>                       - the local build (dist)
# <...>/plugins/cache/<marketplace>/<pack>/<ver>/skills/<name> - an installed plugin
PLUGIN_DIR = re.compile(r"/plugins/(?:cache/(?P<market>[^/]+)/)?(?P<pack>flowai[\w-]*)/(?:(?P<ver>[^/]+)/)?skills/(?P<name>[^/]+)/?$")
COPY_DIR = re.compile(r"/\.(?:claude|cursor|opencode|agents)/skills/(?P<name>[^/]+)/?$")
SLASH = re.compile(r"<command-name>/([^<\s]+)</command-name>")


def fail(message):
    print("flowai-skill-reads: " + message, file=sys.stderr)
    sys.exit(2)


def catalogue():
    """Returns {skill name: pack} for every skill of the local plugin build."""
    if not os.path.isdir(CATALOGUE):
        fail("no plugin build at %s; run `deno task build-plugins` first" % CATALOGUE)
    skills = {}
    for pack in sorted(os.listdir(CATALOGUE)):
        directory = os.path.join(CATALOGUE, pack, "skills")
        if not os.path.isdir(directory):
            continue
        for name in sorted(os.listdir(directory)):
            if os.path.isfile(os.path.join(directory, name, "SKILL.md")):
                skills[name] = pack
    if not skills:
        fail("the plugin build at %s holds no skills" % CATALOGUE)
    return skills


def texts(record):
    content = (record.get("message") or {}).get("content")
    if isinstance(content, str):
        return [content]
    if isinstance(content, list):
        return [item.get("text") or "" for item in content if isinstance(item, dict) and item.get("type") == "text"]
    return []


def tool_calls(record):
    content = (record.get("message") or {}).get("content")
    if not isinstance(content, list):
        return []
    return [str((item.get("input") or {}).get("skill") or "") for item in content
            if isinstance(item, dict) and item.get("type") == "tool_use" and item.get("name") == "Skill"]


def classify(directory, skills):
    """Returns (skill id, source) for a loaded skill directory, or None when it is not a flowai skill."""
    match = PLUGIN_DIR.search(directory)
    if match:
        source = "local build" if not match.group("market") else "%s %s" % (match.group("market"), match.group("ver"))
        return "%s:%s" % (match.group("pack"), match.group("name")), source
    match = COPY_DIR.search(directory)
    if match and match.group("name") in skills:
        return "%s:%s" % (skills[match.group("name")], match.group("name")), "project copy"
    return None


def new_stat():
    return {"loads": 0, "sessions": set(), "roots": collections.Counter(), "sources": collections.Counter(),
            "projects": set(), "tool": 0, "slash": 0, "last": ""}


def scan(root, label, cutoff, skills, stats, seen, totals):
    projects = os.path.join(root, "projects")
    if not os.path.isdir(projects):
        fail("no transcripts directory at %s" % projects)
    cutoff_iso = cutoff.strftime("%Y-%m-%dT%H:%M:%S")
    for directory, _, files in os.walk(projects):
        for file in files:
            path = os.path.join(directory, file)
            if not file.endswith(".jsonl") or os.path.getmtime(path) < cutoff.timestamp():
                continue
            totals["files"] += 1
            with open(path, errors="replace") as handle:
                for line in handle:
                    if not (MARKER in line or '"Skill"' in line or "<command-name>/" in line):
                        continue
                    try:
                        record = json.loads(line)
                    except ValueError:
                        continue
                    if not isinstance(record, dict) or str(record.get("timestamp") or "") < cutoff_iso:
                        continue
                    uuid = record.get("uuid")
                    if uuid in seen:  # a resumed or forked session repeats the records of its parent
                        continue
                    seen.add(uuid)
                    day = record["timestamp"][:10]
                    if record.get("type") == "assistant":
                        for name in tool_calls(record):
                            if name.startswith("flowai"):
                                stats[name]["tool"] += 1
                        continue
                    if record.get("type") != "user":
                        continue
                    for text in texts(record):
                        text = text.lstrip()
                        if text.startswith("<command-"):  # <command-message> comes first, <command-name> second
                            name = SLASH.search(text)
                            if name and name.group(1).startswith("flowai"):
                                stats[name.group(1)]["slash"] += 1
                        if not text.startswith(MARKER):
                            continue
                        found = classify(text[len(MARKER):].split("\n", 1)[0].strip(), skills)
                        if not found:
                            continue
                        stat = stats[found[0]]
                        stat["loads"] += 1
                        stat["sessions"].add(record.get("sessionId"))
                        stat["roots"][label] += 1
                        stat["sources"][found[1]] += 1
                        stat["projects"].add(record.get("cwd"))
                        stat["last"] = max(stat["last"], day)


def main(argv):
    parser = argparse.ArgumentParser(description="Loads of flowai framework skills in Claude Code sessions.")
    parser.add_argument("--days", type=int, default=30, help="window in days (default 30)")
    parser.add_argument("--config-root", action="append", dest="roots", metavar="DIR",
                        help="Claude Code config root; repeatable (default: ~/.claude and ~/.claude-work)")
    parser.add_argument("--json", action="store_true", help="one JSON object per skill instead of the table")
    args = parser.parse_args(argv)
    if args.days < 1:
        fail("--days must be 1 or more")
    skills = catalogue()
    roots = [os.path.expanduser(root) for root in (args.roots or DEFAULT_ROOTS)]
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=args.days)
    stats = collections.defaultdict(new_stat)
    totals = collections.Counter()
    seen = set()
    for root in roots:
        scan(root, os.path.basename(root.rstrip("/")), cutoff, skills, stats, seen, totals)

    known = {"%s:%s" % (pack, name) for name, pack in skills.items()}
    for skill in known:
        stats[skill]  # a catalogue skill with no trace still gets a row
    rows = sorted(stats.items(), key=lambda item: (-item[1]["loads"], item[0]))
    labels = [os.path.basename(root.rstrip("/")) for root in roots]
    if args.json:
        for skill, stat in rows:
            print(json.dumps({
                "skill": skill, "in_catalogue": skill in known, "loads": stat["loads"],
                "sessions": len(stat["sessions"]), "projects": len(stat["projects"]),
                "loads_by_root": dict(stat["roots"]), "loads_by_source": dict(stat["sources"]),
                "skill_tool_calls": stat["tool"], "slash_calls": stat["slash"], "last_load": stat["last"] or None,
            }, ensure_ascii=False))
        return
    print("flowai skill loads, last %d days (since %s); %d transcripts under %s; catalogue: %d skills" % (
        args.days, cutoff.astimezone().date().isoformat(), totals["files"], ", ".join(roots), len(known)))
    used = [(skill, stat) for skill, stat in rows if stat["loads"]]
    width = max([len(skill) for skill, _ in rows] + [5])
    head = "%-*s %6s %8s %8s  %s  %5s %6s  %-10s  %s" % (
        width, "skill", "loads", "sessions", "projects", " ".join("%12s" % label for label in labels),
        "tool", "slash", "last load", "source")
    print("\n" + head)
    for skill, stat in used:
        print("%-*s %6d %8d %8d  %s  %5d %6d  %-10s  %s%s" % (
            width, skill, stat["loads"], len(stat["sessions"]), len(stat["projects"]),
            " ".join("%12d" % stat["roots"][label] for label in labels), stat["tool"], stat["slash"], stat["last"],
            ", ".join("%s x%d" % pair for pair in stat["sources"].most_common()),
            "" if skill in known else "  [not in catalogue]"))
    print("\ntotal: %d loads of %d skills" % (sum(stat["loads"] for _, stat in used), len(used)))
    unused = [skill for skill, stat in rows if not stat["loads"] and skill in known]
    print("\nnever loaded (%d of %d): %s" % (len(unused), len(known), ", ".join(unused) or "-"))
    ghosts = [(skill, stat) for skill, stat in rows if not stat["loads"] and skill not in known]
    if ghosts:
        print("\ncalled by name but never loaded: " + ", ".join(
            "%s (tool %d, slash %d)" % (skill, stat["tool"], stat["slash"]) for skill, stat in ghosts))


if __name__ == "__main__":
    main(sys.argv[1:])
