#!/usr/bin/env bash
# Opus ceiling probe over the 0/3 queue (FR-BENCH-SWE.POOL2 selection).
#
# Runs `pool2-run --model opus` over every id in opus_probe_queue.json into an
# isolated out dir, resumable: already-recorded ids are skipped, auth-fail /
# health-abort leave an id pending (hardened runBaselineBatch), so a re-launch
# after `/login` or a load lull picks up the rest. Grades at the end. The many
# ids go through a bash ARRAY (not string word-splitting, which mis-parsed as a
# single --instance value under the nohup+caffeinate wrapper).
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
OUT="scripts/benchmark/runs/pool2-opus-probe"
QUEUE="$OUT/../pool2-baseline/opus_probe_queue.json"
CONC="${CONC:-2}"
PRED="$OUT/rep1/baseline.jsonl"

mapfile -t IDS < <(python3 -c "import json;[print(i) for i in json.load(open('$QUEUE'))]")
TARGET=${#IDS[@]}
args=(--model opus --effort high --out "$OUT" --rep 1 --concurrency "$CONC")
for id in "${IDS[@]}"; do args+=(--instance "$id"); done

recorded() { [ -f "$PRED" ] && wc -l < "$PRED" | tr -d ' ' || echo 0; }

pass=0
while (( $(recorded) < TARGET )); do
  pass=$((pass+1))
  if (( pass > 15 )); then
    echo "[opus-probe] stuck at $(recorded)/$TARGET after 15 passes — STOP"; exit 43
  fi
  before=$(recorded)
  plog="$OUT/probe-pass$pass.log"
  echo "[opus-probe] pass$pass: $before/$TARGET recorded — launching (conc $CONC)"
  # --no-grade while accumulating; grade once at the end for one clean report.
  caffeinate -is deno run -A scripts/benchmark.ts pool2-run "${args[@]}" --no-grade > "$plog" 2>&1
  after=$(recorded)
  if (( after == before )); then
    if grep -q "AUTH-FAIL" "$plog"; then
      echo "[opus-probe] pass$pass: 0 progress, AUTH-FAIL — TOKEN OUTAGE."
      echo "[opus-probe] STOP. Re-login (claude /login) then re-run this script."; exit 42
    elif grep -q "HEALTH-ABORT" "$plog"; then
      echo "[opus-probe] pass$pass: 0 progress (load aborts) — backing off 300s"; sleep 300
    elif grep -q "SETUP-FAIL" "$plog"; then
      # Transient clone/DNS blip left the whole pass pending — wait for the
      # network to settle, then retry (not a stop: the instances are recoverable).
      echo "[opus-probe] pass$pass: 0 progress (transient clone/DNS) — backing off 120s"; sleep 120
    else
      echo "[opus-probe] pass$pass: 0 progress, NO abort markers — LAUNCH FAILURE. See $plog"; exit 44
    fi
  fi
done

echo "[opus-probe] all $TARGET recorded — grading"
caffeinate -is deno run -A scripts/benchmark.ts pool2-run "${args[@]}" > "$OUT/probe-grade.log" 2>&1
grep -oE "rep1: [0-9]+/[0-9]+ resolved" "$OUT/probe-grade.log" | tail -1 | sed 's/^/[opus-probe] graded: /'
echo "[opus-probe] DONE"
