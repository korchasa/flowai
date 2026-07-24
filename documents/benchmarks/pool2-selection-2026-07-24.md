# Pool2 Headroom Selection — Baseline (Sonnet) + Opus Ceiling

Generated snapshot. Machine source of truth: `scripts/benchmark/pool2_headroom.json`
(regenerate via `deno run -A scripts/benchmark.ts pool2-select`; integrity
guarded by `pool2_headroom_test.ts`). This document records the FULL funnel,
including the rejected ("failed") instances, not just the survivors.

## Provenance

- **Dataset:** `nebius/SWE-rebench-leaderboard`, split `2026_03`; grading via the
  SWE-rebench swebench fork @ `e4907b7a` (amd64 images under Rosetta).
- **Model:** baseline `claude-sonnet-5`; ceiling probe `claude-opus`. Effort
  `high`, pinned identically for agent + judge in both arms (A/B invariant).
- **Vintage:** admit only `created_at` strictly after training cutoff `2026-01`
  (cut `2026-01-31`) — every instance is post-cutoff, so none was in training.
- **Measurement:** 3 Sonnet baseline reps (distinct run_ids) + 1 Opus probe over
  the Sonnet-0/3 queue. Same maxSteps=3 baseline scaffold as the campaign.

## Funnel (66 eligible + 1 excluded = 67)

- **Per-rep Sonnet resolved:** rep1 31, rep2 30, rep3 31 (of 67) — ~46% pass@1,
  strikingly stable across reps.
- **Opus ceiling probe:** 0 of 26 solved. Opus produced a real patch for every
  0/3 instance (finishing in 1 of its 3 available turns, never hitting the step
  cap or the 20-min timeout), but none passed F2P — so no 0/3 instance has a
  reachable ceiling on our scaffold.
- **Verdict split:**
  - `keeper` 8 — real A/B headroom (Sonnet solves exactly 1 of 3).
  - `reject_no_headroom` 32 — Sonnet already reliable (2/3 or 3/3).
  - `reject_no_ceiling` 26 — Sonnet 0/3 AND Opus also failed (unsolvable here).
  - `excluded` 1 — un-gradeable (unfetchable base ref).

## Key finding

On fresh SWE-rebench tasks the maxSteps=3 baseline scaffold is **bimodal**:
Sonnet either solves an instance reliably (2–3/3, 32 of 66) or nobody solves it
even with Opus (0/3, 26 of 66). The band where flowai assistance could move the
needle — Sonnet inconsistent (1/3) — is just **8 of 66**. The 0/26 Opus result
is on the merits (patch ≠ dataset gold behaviour), not a scaffold-room limit, so
widening the scaffold would not recover those 26.

Harness note: three "never fairly attempted → banked as a false miss" bugs were
found and fixed mid-campaign (system_health abort, ACP token expiry, transient
clone/DNS blip); each now leaves the instance pending for a retry. Two keepers
(`tobymao__sqlglot-7479`, `tox-dev__tox-3931`) were originally false 0/3s from a
token expiry — the fix is what put them in the pool.

## keeper (8)

- `agronholm__anyio-1121` (patch 1768B, F2P 1)
- `tox-dev__tox-3931` (patch 1848B, F2P 1)
- `tobymao__sqlglot-7479` (patch 1895B, F2P 1)
- `raullenchai__rapid-mlx-228` (patch 1975B, F2P 2)
- `alibaba__opensandbox-816` (patch 2092B, F2P 1)
- `graphistry__pygraphistry-1107_interface` (patch 3041B, F2P 7)
- `nesquena__hermes-webui-330_interface` (patch 4655B, F2P 4)
- `graphistry__pygraphistry-1277` (patch 5566B, F2P 2)

## reject_no_headroom (32) — Sonnet 2/3 or 3/3

- `macbre__sql-metadata-625_interface` (patch 1078B, F2P 1)
- `ultraplot__ultraplot-696` (patch 1179B, F2P 2)
- `deltares__hydrolib-core-1049_interface` (patch 1625B, F2P 2)
- `microsoft__qcodes-8039` (patch 1738B, F2P 2)
- `apache__iceberg-python-3295` (patch 1916B, F2P 7)
- `beever-ai__beever-atlas-102` (patch 2252B, F2P 1)
- `meltano__meltano-9950` (patch 2312B, F2P 3)
- `raullenchai__rapid-mlx-289` (patch 2419B, F2P 2)
- `hkuds__openharness-217` (patch 2433B, F2P 6)
- `ucfopen__canvasapi-716` (patch 2501B, F2P 2)
- `pdm-project__pdm-3759` (patch 2580B, F2P 1)
- `unit8co__darts-3065` (patch 2604B, F2P 4)
- `raullenchai__rapid-mlx-227` (patch 2642B, F2P 5)
- `zarr-developers__virtualizarr-979` (patch 2757B, F2P 3)
- `marshmallow-code__marshmallow-2925_interface` (patch 2882B, F2P 2)
- `reframe-hpc__reframe-3660_interface` (patch 3137B, F2P 1)
- `olofk__fusesoc-776_interface` (patch 3154B, F2P 1)
- `raullenchai__rapid-mlx-341_interface` (patch 3471B, F2P 2)
- `tox-dev__tox-3904` (patch 3541B, F2P 2)
- `tobymao__sqlglot-7457` (patch 4060B, F2P 1)
- `sigma67__ytmusicapi-909_interface` (patch 4062B, F2P 25)
- `python-wheel-build__fromager-1106` (patch 4075B, F2P 5)
- `copier-org__copier-2646` (patch 4456B, F2P 1)
- `schemathesis__schemathesis-3933` (patch 4673B, F2P 1)
- `astronomy-commons__lsdb-1349` (patch 4920B, F2P 1)
- `pipecat-ai__pipecat-4283` (patch 5500B, F2P 1)
- `cpp-linter__cpp-linter-hooks-206_interface` (patch 6598B, F2P 3)
- `mempalace__mempalace-1004` (patch 6883B, F2P 2)
- `vprusso__toqito-1538` (patch 8982B, F2P 15)
- `python-scim__scim2-models-139_interface` (patch 16184B, F2P 9)
- `line__line-bot-sdk-python-981_interface` (patch 17318B, F2P 4)
- `aallan__vera-662_interface` (patch 18348B, F2P 2)

## reject_no_ceiling (26) — Sonnet 0/3 AND Opus failed

- `pypa__twine-1309` (patch 1131B, F2P 1)
- `schemathesis__schemathesis-4087` (patch 2171B, F2P 2)
- `cs-si__eodag-2176` (patch 2182B, F2P 1)
- `pypa__build-1027` (patch 2343B, F2P 4)
- `pyinfra-dev__pyinfra-1665` (patch 2382B, F2P 1)
- `oemof__tespy-921` (patch 2665B, F2P 1)
- `agentscope-ai__qwenpaw-3278` (patch 2728B, F2P 13)
- `agronholm__anyio-1134` (patch 2838B, F2P 4)
- `geopython__pygeoapi-2338` (patch 2947B, F2P 5)
- `zauberzeug__nicegui-5914` (patch 3212B, F2P 1)
- `databricks__dbt-databricks-1428` (patch 3264B, F2P 2)
- `azure-samples__azure-search-openai-demo-3025` (patch 3616B, F2P 2)
- `huggingface__huggingface_hub-4056` (patch 3806B, F2P 2)
- `koxudaxi__datamodel-code-generator-3071` (patch 4663B, F2P 8)
- `pyinfra-dev__pyinfra-1679_interface` (patch 4704B, F2P 3)
- `schemathesis__schemathesis-3778` (patch 4789B, F2P 1)
- `pennylaneai__pennylane-9298` (patch 4950B, F2P 1)
- `python-wheel-build__fromager-1124` (patch 5364B, F2P 7)
- `nesquena__hermes-webui-2056` (patch 6056B, F2P 3)
- `spack__spack-52244` (patch 7212B, F2P 2)
- `pallets-eco__wtforms-892_interface` (patch 8283B, F2P 10)
- `meltano__meltano-9929` (patch 9228B, F2P 6)
- `koxudaxi__datamodel-code-generator-3070` (patch 9698B, F2P 4)
- `itsdnns__docsight-437` (patch 10037B, F2P 5)
- `nesquena__hermes-webui-1818` (patch 10459B, F2P 1)
- `celestoai__smolvm-172` (patch 21776B, F2P 8)

## excluded (1)

- `youssofal__mtplx-21` (patch 5898B, F2P 4) — base commit unfetchable
  (`git upload-pack: not our ref`); dropped from the pool, not a real miss.
