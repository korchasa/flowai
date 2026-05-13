#!/usr/bin/env bash
# Find Claude Code npm versions published within a date range.
# Usage: cc-find-version.sh <from-date> <to-date>
# Example: cc-find-version.sh 2026-01-01 2026-01-10
#
# Outputs: version: publish_timestamp (one per line)
# Requires: npm, python3

set -euo pipefail

FROM="${1:?Usage: cc-find-version.sh <from-date> <to-date>}"
TO="${2:?Usage: cc-find-version.sh <from-date> <to-date>}"

npm view @anthropic-ai/claude-code time --json 2>/dev/null | python3 -c "
import json, sys
from datetime import datetime

data = json.load(sys.stdin)
from_date = datetime.fromisoformat('${FROM}T00:00:00+00:00')
to_date = datetime.fromisoformat('${TO}T23:59:59+00:00')

versions = []
for ver, ts in data.items():
    if ver in ('created', 'modified'):
        continue
    try:
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        if from_date <= dt <= to_date:
            versions.append((dt, ver, ts))
    except (ValueError, TypeError):
        pass

for dt, ver, ts in sorted(versions):
    print(f'{ver}: {ts}')

if not versions:
    print(f'No versions found between {from_date.date()} and {to_date.date()}', file=sys.stderr)
    sys.exit(1)
"
