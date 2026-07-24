#!/usr/bin/env bash
# Sequential pool2 baseline campaign driver (FR-BENCH-SWE.POOL2).
#
# Runs reps 1..3 of the baseline arm to completion, one rep at a time (never two
# concurrent reps — that would self-overload the machine). Each rep re-invokes
# the hardened `pool2-run` CLI until all 67 gate-passers are recorded, honoring
# the two "never fairly attempted" leave-pending signals the harness emits:
#   - HEALTH-ABORT (exit 75, system_health): machine overloaded -> wait for calm.
#   - AUTH-FAIL (ACP -32000): OAuth token expired -> STOP and ask for re-login.
# Resumable & idempotent: re-launching after a stop picks up from the on-disk
# predictions (records-count driven). Detach under nohup+caffeinate.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
BASE="scripts/benchmark/runs/pool2-baseline"
TARGET=67
CONC="${CONC:-2}"
CALM_LOAD="${CALM_LOAD:-25}"   # both 1m & 5m load must be under this to launch a pass

records() {
  local f="$BASE/rep$1/baseline.jsonl"
  if [ -f "$f" ]; then wc -l < "$f" | tr -d ' '; else echo 0; fi
}

# Block until the machine is calm enough that 2 more sessions won't trip the
# system_health guard (fires at load > 4/CPU). Caps the wait so a permanently
# busy machine still makes attempts (the guard then protects us, leaving pending).
wait_calm() {
  local waited=0 l1 l5
  while :; do
    l1=$(sysctl -n vm.loadavg | awk '{print $2}')
    l5=$(sysctl -n vm.loadavg | awk '{print $4}')
    if awk -v a="$l1" -v b="$l5" -v t="$CALM_LOAD" 'BEGIN{exit !(a<t && b<t)}'; then return 0; fi
    if (( waited >= 1800 )); then
      echo "[campaign] calm-wait cap (load $l1/$l5) — proceeding, guard protects"
      return 0
    fi
    echo "[campaign] load $l1/$l5 >= $CALM_LOAD — waiting 120s"
    sleep 120; waited=$((waited+120))
  done
}

run_rep() {
  local rep="$1" pass=0 before after
  # Create the rep dir up front: pool2-run makes it, but the pass-log redirect
  # below runs FIRST, so on a fresh rep (rep2/rep3) the redirect would fail
  # before deno ever starts — a launch failure that once masqueraded as a load
  # abort and spun for 20 passes. Ensure it exists so the log is always writable.
  mkdir -p "$BASE/rep$rep"
  while (( $(records "$rep") < TARGET )); do
    pass=$((pass+1))
    if (( pass > 20 )); then
      echo "[campaign] rep$rep stuck at $(records "$rep")/$TARGET after 20 passes — STOP"
      exit 43
    fi
    before=$(records "$rep")
    wait_calm
    local plog="$BASE/rep$rep/campaign-pass$pass.log"
    echo "[campaign] rep$rep pass$pass: $before/$TARGET recorded — launching (conc $CONC)"
    caffeinate -is deno run -A scripts/benchmark.ts pool2-run \
      --rep "$rep" --concurrency "$CONC" --no-grade > "$plog" 2>&1
    after=$(records "$rep")
    if (( after == before )); then
      # Zero progress — diagnose the cause HONESTLY from the pass log rather than
      # assuming load (the old blind-backoff hid a launch failure for 2 h).
      if [ -s "$plog" ] && grep -q "AUTH-FAIL" "$plog"; then
        echo "[campaign] rep$rep pass$pass: 0 progress, AUTH-FAIL — TOKEN OUTAGE."
        echo "[campaign] STOP. Re-login (claude /login) then re-run this script to resume."
        exit 42
      elif [ -s "$plog" ] && grep -q "HEALTH-ABORT" "$plog"; then
        echo "[campaign] rep$rep pass$pass: 0 progress (system_health load aborts) — backing off 300s"
        sleep 300
      else
        echo "[campaign] rep$rep pass$pass: 0 progress with NO abort markers — LAUNCH FAILURE"
        echo "[campaign] (deno crashed / setup broke). See $plog. STOP — not spinning."
        exit 44
      fi
    fi
  done
  echo "[campaign] rep$rep complete ($(records "$rep")/$TARGET) — grading"
  caffeinate -is deno run -A scripts/benchmark.ts pool2-run \
    --rep "$rep" --concurrency "$CONC" > "$BASE/rep$rep/campaign-grade.log" 2>&1
  local solved
  solved=$(grep -oE "rep$rep: [0-9]+/[0-9]+ resolved" "$BASE/rep$rep/campaign-grade.log" | tail -1 || true)
  echo "[campaign] rep$rep graded: ${solved:-<grade line not found>}"
}

# Which reps to run (default all three). A resume after a completed rep passes
# e.g. REPS="2 3" to skip the already-graded rep-1 and avoid re-grading it.
REPS="${REPS:-1 2 3}"
echo "[campaign] START reps [$REPS] target=$TARGET conc=$CONC calm<$CALM_LOAD"
for rep in $REPS; do
  echo "[campaign] === REP $rep ==="
  run_rep "$rep"
done
echo "[campaign] ALL REPS DONE"
