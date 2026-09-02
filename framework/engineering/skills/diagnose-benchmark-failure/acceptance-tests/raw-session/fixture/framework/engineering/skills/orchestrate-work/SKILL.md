---
name: orchestrate-work
description: Split independent work items and run them in parallel through subagents. Use when a request names several areas that do not share files.
---

# Orchestrate Work

## Rules

<rules>
1. Split the request into work items and check whether they share files. Items
   that share a file are NOT independent and must run in sequence.
2. Fan independent items out to subagents, one item per worker.
3. Merge the workers' results before reporting.
4. If parallel execution is unavailable in the current environment, proceed
   sequentially and say so.
</rules>

## Step-by-step

<step_by_step>

1. Enumerate the work items named in the request.
2. For each pair, decide whether they touch the same files.
3. Dispatch every independent item to its own worker.
4. Collect the workers' output and merge it.
5. Report what each worker produced.

</step_by_step>
