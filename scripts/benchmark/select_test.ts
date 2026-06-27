import { assert, assertEquals } from "@std/assert";
import {
  type Candidate,
  difficultyRank,
  type InstanceMeta,
  selectCandidates,
  selectPool,
} from "./select.ts";

const META: InstanceMeta[] = [
  // resolved by sonnet -> must be dropped
  {
    instance_id: "a__a-1",
    repo: "a/a",
    difficulty: "<15 min fix",
    patch_bytes: 100,
    f2p: 1,
  },
  // denied repo -> must be dropped even though cheapest
  {
    instance_id: "mpl__mpl-1",
    repo: "matplotlib/matplotlib",
    difficulty: "<15 min fix",
    patch_bytes: 50,
    f2p: 1,
  },
  // kept, medium
  {
    instance_id: "b__b-2",
    repo: "b/b",
    difficulty: "15 min - 1 hour",
    patch_bytes: 200,
    f2p: 1,
  },
  // kept, easy, bigger patch
  {
    instance_id: "c__c-3",
    repo: "c/c",
    difficulty: "<15 min fix",
    patch_bytes: 900,
    f2p: 1,
  },
  // kept, easy, smaller patch -> should sort first overall
  {
    instance_id: "d__d-4",
    repo: "d/d",
    difficulty: "<15 min fix",
    patch_bytes: 300,
    f2p: 1,
  },
];

const RESOLVED = new Set(["a__a-1"]);
const DENY = new Set(["matplotlib/matplotlib"]);

Deno.test("difficultyRank: orders easy < medium < hard < very hard < unknown", () => {
  assert(difficultyRank("<15 min fix") < difficultyRank("15 min - 1 hour"));
  assert(difficultyRank("15 min - 1 hour") < difficultyRank("1-4 hours"));
  assert(difficultyRank("1-4 hours") < difficultyRank(">4 hours"));
  assert(difficultyRank(">4 hours") < difficultyRank("???"));
});

Deno.test("selectCandidates: drops resolved and denied repos", () => {
  const out = selectCandidates(META, RESOLVED, DENY);
  const ids = out.map((c) => c.instanceId);
  assert(!ids.includes("a__a-1"), "resolved instance must be dropped");
  assert(!ids.includes("mpl__mpl-1"), "denied repo must be dropped");
  assertEquals(out.length, 3);
});

Deno.test("selectCandidates: cheapest-first by difficulty then patch bytes", () => {
  const out = selectCandidates(META, RESOLVED, DENY);
  assertEquals(out.map((c) => c.instanceId), ["d__d-4", "c__c-3", "b__b-2"]);
});

Deno.test("selectCandidates: maps snake_case meta to camelCase Candidate", () => {
  const out = selectCandidates(META, RESOLVED, DENY);
  const first: Candidate = out[0];
  assertEquals(first.patchBytes, 300);
  assertEquals(first.repo, "d/d");
  assertEquals(first.f2p, 1);
});

Deno.test("selectPool: keeps only CC-failed AND sonnet-unsolved, non-denied", () => {
  // CC(Opus+vexp) failed these; sonnet RESOLVED a__a-1 so it must drop out.
  const ccFailed = new Set(["a__a-1", "c__c-3", "d__d-4", "mpl__mpl-1"]);
  const out = selectPool(META, ccFailed, RESOLVED, DENY);
  const ids = out.map((c) => c.instanceId);
  assert(!ids.includes("a__a-1"), "sonnet-resolved must drop");
  assert(!ids.includes("mpl__mpl-1"), "denied repo must drop");
  assert(!ids.includes("b__b-2"), "not CC-failed must drop");
  // c__c-3 and d__d-4 remain, cheapest-first (both easy: d=300 < c=900)
  assertEquals(ids, ["d__d-4", "c__c-3"]);
});

Deno.test("selectPool: empty when no instance is in all three sets", () => {
  const out = selectPool(META, new Set(["b__b-2"]), RESOLVED, DENY);
  // b__b-2 is CC-failed and not sonnet-resolved and not denied -> kept
  assertEquals(out.map((c) => c.instanceId), ["b__b-2"]);
  // nothing CC-failed -> empty
  assertEquals(selectPool(META, new Set<string>(), RESOLVED, DENY), []);
});
