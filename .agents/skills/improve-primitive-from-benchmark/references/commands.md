# Benchmark Commands Reference

All commands run from the repo root. FR-BENCH-SWE; CLI: `scripts/benchmark.ts` (subcommands: `setup`, `select`, `verify`, `run`, `report`).

## Preconditions

- `deno run -A scripts/benchmark.ts setup` — creates `.venv-swebench`, installs swebench, warms the dataset cache. Needed once per machine; Docker must be running for grading.
- Pool: `scripts/benchmark/pool.json` (13 instances, cheapest-first).

## Run one (arm, instance)

```sh
deno run -A scripts/benchmark.ts run --arm flowai --instance <id> \
  --out scripts/benchmark/runs/<run-id>/flowai/<id> --step-timeout 1200000 \
  > scripts/benchmark/runs/<run-id>/flowai-<id>.console.log 2>&1
```

- `--arm baseline | flowai`; `--model` defaults to `sonnet`.
- Baseline is normally NOT re-run — reuse the latest same-harness baseline report from `documents/benchmarks/`.

## Resumable orchestrator pattern

Prior art: `scripts/benchmark/runs/run-skillfix-ab.sh`. Key properties:

- One `--out` dir per `(arm, instance)`; skip when `<out>/<arm>.jsonl` already exists and is non-empty.
- Concurrency cap 4 (`while [ "$(jobs -rp | wc -l)" -ge 4 ]; do wait -n; done`).
- Append exit codes to `_exits.log`; run detached (`run_in_background`), poll `_exits.log`, do NOT pipe through `tail -N`.

## Output layout (per `--out` dir)

- `<out>/<arm>.jsonl` — the prediction (`instance_id`, `model_name_or_path` = arm name, `model_patch`).
- `<out>/<arm>/<instance>/<instance>.log` — the agent session transcript (root-cause source).
- `<out>/<arm>/<instance>/sandbox/` — post-run working tree; flowai plan task files land in `sandbox/documents/tasks/`.

## Grade

```sh
cat scripts/benchmark/runs/<run-id>/flowai/*/flowai.jsonl > scripts/benchmark/runs/<run-id>/flowai.jsonl
deno run -A scripts/benchmark.ts verify \
  --predictions scripts/benchmark/runs/<run-id>/flowai.jsonl \
  --model flowai --run-id <run-id>
```

- `--model` must equal the predictions' `model_name_or_path` (arm name).
- Empty patches are not graded — swebench reports N-graded < N-pool; count them as `—`, not as failures of grading.
- Per-instance verdict: `logs/run_evaluation/<run-id>/<model>/<instance>/report.json` (`resolved`), test log next to it in `test_output.txt`.
- Cleanup: the harness drops `<model>.<run-id>.json` at the REPO ROOT — delete after collecting results.
- To grade only missing instances after an interrupted run: build a subset predictions JSONL and re-run `verify` with the same `--run-id` (existing reports are kept).
- `benchmark.ts report` grades both arms and renders the A/B markdown in one shot — use when both arms are fresh.

## Gold patches and FAIL_TO_PASS

Needed in Phase 3 to compare `model_patch` against the reference. Dump once per run dir:

```sh
.venv-swebench/bin/python - <<'EOF' > scripts/benchmark/runs/<run-id>/_gold.json
import json
from datasets import load_dataset
ds = load_dataset("princeton-nlp/SWE-bench_Verified", split="test")
ids = set(json.load(open("scripts/benchmark/pool.json")))
rows = {r["instance_id"]: {"patch": r["patch"], "test_patch": r["test_patch"],
        "FAIL_TO_PASS": r["FAIL_TO_PASS"]} for r in ds if r["instance_id"] in ids}
print(json.dumps(rows, indent=1))
EOF
```

Adjust the `ids` extraction to the actual `pool.json` shape if it stores objects rather than bare ids.

Structural caveat for root-causing: FAIL_TO_PASS tests are injected by the gold `test_patch` and are ABSENT from the agent's sandbox — the agent can never run the real oracle. Self-authored tests passing therefore proves consistency with the agent's own reading, not correctness.
