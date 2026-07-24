import { assert, assertEquals } from "@std/assert";
import { buildRebenchArgs, REBENCH_DATASET } from "./rebench.ts";

Deno.test("buildRebenchArgs: fork harness invocation with dataset, split, gold predictions", () => {
  const args = buildRebenchArgs({
    predictionsPath: "gold",
    runId: "pool2gate-r1",
    modelName: "gold",
    split: "2026_03",
  });
  assertEquals(args.slice(0, 2), ["-m", "swebench.harness.run_evaluation"]);
  const s = args.join(" ");
  assert(s.includes(`--dataset_name ${REBENCH_DATASET}`));
  assert(s.includes("--split 2026_03"));
  assert(s.includes("--predictions_path gold"));
  assert(s.includes("--run_id pool2gate-r1"));
  assert(s.includes("--max_workers 1"), "sequential by default");
});

Deno.test("buildRebenchArgs: instance ids appended only when present", () => {
  const without = buildRebenchArgs({
    predictionsPath: "gold",
    runId: "r",
    modelName: "gold",
    split: "2026_03",
  });
  assert(!without.includes("--instance_ids"));
  const with2 = buildRebenchArgs({
    predictionsPath: "gold",
    runId: "r",
    modelName: "gold",
    split: "2026_03",
    instanceIds: ["a__b-1", "c__d-2"],
  });
  const i = with2.indexOf("--instance_ids");
  assertEquals(with2.slice(i + 1, i + 3), ["a__b-1", "c__d-2"]);
});
