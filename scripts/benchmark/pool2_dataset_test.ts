import { assert, assertEquals, assertRejects } from "@std/assert";
import { loadPool2InstanceData } from "./pool2_dataset.ts";
import type { RowsFetcher } from "./pool2_fetch.ts";

const ROWS: Record<string, unknown>[] = [
  {
    instance_id: "a__b-1",
    repo: "a/b",
    base_commit: "c0ffee",
    problem_statement: "Issue one.",
    version: "1.2",
    install_config: {
      python: "3.13",
      pre_install: [],
      packages: "",
      pip_packages: [],
      install: 'pip install -e ".[tests]" -q',
    },
  },
  {
    instance_id: "c__d-2",
    repo: "c/d",
    base_commit: "deadbeef",
    problem_statement: "Issue two.",
    version: "0.9",
  },
  {
    instance_id: "e__f-3",
    repo: "e/f",
    base_commit: "abc123",
    problem_statement: "Issue three.",
    version: "",
  },
];

function splitFetcher(): RowsFetcher {
  return (url) => {
    const offset = Number(new URL(url).searchParams.get("offset"));
    const length = Number(new URL(url).searchParams.get("length"));
    return Promise.resolve({
      num_rows_total: ROWS.length,
      rows: ROWS.slice(offset, offset + length).map((row) => ({ row })),
    });
  };
}

Deno.test("loadPool2InstanceData: returns InstanceData for wanted ids only", async () => {
  const map = await loadPool2InstanceData(
    ["a__b-1", "e__f-3"],
    "2026_03",
    splitFetcher(),
  );
  assertEquals(map.size, 2);
  const a = map.get("a__b-1")!;
  assertEquals(a.repo, "a/b");
  assertEquals(a.baseCommit, "c0ffee");
  assertEquals(a.problemStatement, "Issue one.");
  assertEquals(a.version, "1.2");
  assertEquals(map.get("e__f-3")!.baseCommit, "abc123");
  assertEquals(map.has("c__d-2"), false, "unwanted id excluded");
});

/**
 * The sandbox is a bare clone unless the row's own install recipe reaches it.
 * Without this the agent had no importable package and no runnable suite, which
 * charged the flowai arm for the harness's missing environment (rep 1,
 * 2026-07-28: `smolvm-172` and `virtualizarr-979` produced no patch at all).
 */
Deno.test("loadPool2InstanceData: carries the row's install recipe, and null when the row has none", async () => {
  const map = await loadPool2InstanceData(
    ["a__b-1", "e__f-3"],
    "2026_03",
    splitFetcher(),
  );
  const cfg = map.get("a__b-1")!.installConfig;
  assert(cfg, "the install recipe must reach the sandbox");
  assertEquals(cfg!.python, "3.13");
  assertEquals(cfg!.install, 'pip install -e ".[tests]" -q');
  assertEquals(
    map.get("e__f-3")!.installConfig,
    null,
    "a row without a recipe leaves the sandbox bare rather than guessing one",
  );
});

Deno.test("loadPool2InstanceData: a wanted id absent from the split fails fast", async () => {
  await assertRejects(
    () =>
      loadPool2InstanceData(
        ["a__b-1", "ghost__x-9"],
        "2026_03",
        splitFetcher(),
      ),
    Error,
    "ghost__x-9",
  );
});
