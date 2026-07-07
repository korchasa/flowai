import { assert, assertEquals } from "@std/assert";
import {
  allCandidateIds,
  ARM64_DENY,
  candidateById,
  CANDIDATES,
  cheapestIds,
  isHeadroomKeeper,
  MEASURED_HEADROOM,
  OPUS_BASELINE,
  OPUS_RESOLVED,
  POOL,
  poolIds,
  SONNET_BASELINE,
  SONNET_RESOLVED,
} from "./instances.ts";
import { difficultyRank } from "./select.ts";

Deno.test("baseline: published sonnet resolved set matches its count", () => {
  assertEquals(SONNET_RESOLVED.size, SONNET_BASELINE.resolvedCount);
  assert(SONNET_RESOLVED.size > 0);
});

Deno.test("baseline: published opus resolved set matches its count", () => {
  assertEquals(OPUS_RESOLVED.size, OPUS_BASELINE.resolvedCount);
  assert(OPUS_RESOLVED.size > 0);
});

Deno.test("candidates: none were resolved by the sonnet baseline", () => {
  for (const c of CANDIDATES) {
    assert(
      !SONNET_RESOLVED.has(c.instanceId),
      `${c.instanceId} is resolved by sonnet — must not be a candidate`,
    );
  }
});

Deno.test("candidates: no deny-listed repos", () => {
  const deny = new Set(ARM64_DENY);
  for (const c of CANDIDATES) {
    assert(!deny.has(c.repo), `${c.repo} is deny-listed`);
  }
});

Deno.test("candidates: ordered cheapest-first (difficulty then patch bytes)", () => {
  for (let i = 1; i < CANDIDATES.length; i++) {
    const prev = CANDIDATES[i - 1];
    const cur = CANDIDATES[i];
    const dp = difficultyRank(prev.difficulty);
    const dc = difficultyRank(cur.difficulty);
    assert(
      dp < dc || (dp === dc && prev.patchBytes <= cur.patchBytes),
      `out of cheap-first order at ${i}: ${prev.instanceId} -> ${cur.instanceId}`,
    );
  }
});

Deno.test("candidates: instance id prefix matches its repo", () => {
  for (const c of CANDIDATES) {
    const expected = c.repo.replace("/", "__");
    assert(
      c.instanceId.startsWith(expected + "-"),
      `${c.instanceId} does not match repo ${c.repo}`,
    );
  }
});

Deno.test("cheapestIds: returns the first n candidate ids", () => {
  const ids = cheapestIds(3);
  assertEquals(ids.length, 3);
  assertEquals(ids, allCandidateIds().slice(0, 3));
});

Deno.test("candidateById: resolves a known candidate, undefined otherwise", () => {
  const first = CANDIDATES[0];
  assertEquals(candidateById(first.instanceId)?.repo, first.repo);
  assertEquals(candidateById("nonexistent__nope-0"), undefined);
});

Deno.test("pool: measured-headroom set — every member is a keeper on our scaffold", () => {
  assert(POOL.length > 0);
  for (const c of POOL) {
    const m = MEASURED_HEADROOM[c.instanceId];
    assert(m, `${c.instanceId} has no measured-headroom record`);
    assert(
      isHeadroomKeeper(m),
      `${c.instanceId} fails keep-rule: sonnet_reps=${m.sonnet_reps} opus=${m.opus_resolved}`,
    );
  }
});

Deno.test("pool: no denied repos", () => {
  const deny = new Set(ARM64_DENY);
  for (const c of POOL) {
    assert(!deny.has(c.repo), `${c.repo} deny-listed`);
  }
});

Deno.test("pool: ordered cheapest-first; poolIds reflects POOL order", () => {
  for (let i = 1; i < POOL.length; i++) {
    const dp = difficultyRank(POOL[i - 1].difficulty);
    const dc = difficultyRank(POOL[i].difficulty);
    assert(
      dp < dc || (dp === dc && POOL[i - 1].patchBytes <= POOL[i].patchBytes),
      `pool out of cheap-first order at ${i}`,
    );
  }
  assertEquals(poolIds(), POOL.map((c) => c.instanceId));
});

Deno.test("candidateById: resolves a pool member by id", () => {
  const p = POOL[0];
  assertEquals(candidateById(p.instanceId)?.repo, p.repo);
});
