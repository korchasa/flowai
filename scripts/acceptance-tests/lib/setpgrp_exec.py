#!/usr/bin/env python3
"""Detach from parent process group via setsid(), then exec target.

Used by `SpawnedAgent` so the resource watchdog can SIGKILL the entire
process group rooted at the agent — including grandchildren that reparent
to PID 1 after their immediate parent dies. Without `setsid()`, killing the
agent's tree-by-PPID misses orphaned descendants and lets them keep
forking (observed on 2026-05-09 during a `flowai-configure-deno-commands`
trigger-pos scenario, which leaked ~hundreds of `deno test` orphans after
the watchdog fired and ultimately required a host reboot).

After `os.setsid()` the calling process becomes the leader of a new
session and a new process group whose PGID equals its PID. Every
descendant inherits this PGID. `kill -- -<PGID>` then signals all of them
in one syscall, regardless of subsequent re-parenting.

Inline alternative considered: `python3 -c '...'`. Rejected because the
wrapper is invoked on every agent step and a named file is easier to grep
for, lint, and keep in sync with the watchdog kill path.
"""
import os
import sys

if len(sys.argv) < 2:
    sys.stderr.write(f"usage: {sys.argv[0]} <command> [args...]\n")
    sys.exit(2)

os.setsid()
os.execvp(sys.argv[1], sys.argv[1:])
