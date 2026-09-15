import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import {
  bridgeBinPath,
  bridgeDirName,
  ensureBridgeInstalled,
  isBridgeInstalled,
  resolveBridgeCommand,
} from "./bridge_store.ts";
import { ACP_AGENTS } from "./registry.ts";

const SPEC = {
  package: "@agentclientprotocol/codex-acp",
  version: "1.1.7",
  bin: "codex-acp",
} as const;

async function fakeStoreWith(spec: typeof SPEC): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "acp-bridge-store-" });
  const binDir = join(root, bridgeDirName(spec), "node_modules", ".bin");
  await Deno.mkdir(binDir, { recursive: true });
  await Deno.writeTextFile(join(binDir, spec.bin), "#!/bin/sh\nexit 0\n");
  return root;
}

Deno.test("bridgeDirName flattens the npm scope and keeps the pinned version", () => {
  assertEquals(bridgeDirName(SPEC), "agentclientprotocol__codex-acp@1.1.7");
  assertEquals(
    bridgeDirName({ package: "plain-pkg", version: "2.0.0", bin: "x" }),
    "plain-pkg@2.0.0",
  );
});

Deno.test("bridgeDirName separates two pinned versions of one package", () => {
  const a = bridgeDirName(SPEC);
  const b = bridgeDirName({ ...SPEC, version: "1.1.8" });
  assert(a !== b, "two versions must not share a store directory");
});

Deno.test("bridgeBinPath points at the npm-generated launcher", async () => {
  const root = await fakeStoreWith(SPEC);
  try {
    assertEquals(
      bridgeBinPath(root, SPEC),
      join(root, bridgeDirName(SPEC), "node_modules", ".bin", "codex-acp"),
    );
    assertEquals(isBridgeInstalled(root, SPEC), true);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("isBridgeInstalled is false for a version that was never installed", async () => {
  const root = await fakeStoreWith(SPEC);
  try {
    assertEquals(isBridgeInstalled(root, { ...SPEC, version: "9.9.9" }), false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("resolveBridgeCommand returns a native binary launch verbatim", () => {
  const resolved = resolveBridgeCommand({
    kind: "binary",
    command: "cursor-agent",
    args: ["--acp"],
  }, "/nonexistent-store");
  assertEquals(resolved, { command: "cursor-agent", args: ["--acp"] });
});

Deno.test("resolveBridgeCommand returns the installed bridge as an absolute command", async () => {
  const root = await fakeStoreWith(SPEC);
  try {
    const resolved = resolveBridgeCommand({ kind: "npm", ...SPEC }, root);
    assertEquals(resolved.command, bridgeBinPath(root, SPEC));
    assertEquals(resolved.args, []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("resolveBridgeCommand fails fast when the bridge is missing", async () => {
  const root = await Deno.makeTempDir({ prefix: "acp-bridge-empty-" });
  try {
    let message = "";
    try {
      resolveBridgeCommand({ kind: "npm", ...SPEC }, root);
    } catch (e) {
      message = (e as Error).message;
    }
    assertStringIncludes(message, "@agentclientprotocol/codex-acp@1.1.7");
    assertStringIncludes(message, "deno task acp-bridges");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("ensureBridgeInstalled does nothing when the pinned version is present", async () => {
  const root = await fakeStoreWith(SPEC);
  try {
    const before = await Deno.stat(bridgeBinPath(root, SPEC));
    await ensureBridgeInstalled(root, SPEC);
    const after = await Deno.stat(bridgeBinPath(root, SPEC));
    assertEquals(after.mtime?.getTime(), before.mtime?.getTime());
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("no registry launch shells out to npx", () => {
  for (const spec of Object.values(ACP_AGENTS)) {
    if (spec.launch.kind === "binary") {
      assert(
        spec.launch.command !== "npx",
        `${spec.ide} still launches through npx`,
      );
    }
  }
});
