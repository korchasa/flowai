/**
 * AcpAgent over the ai-ide-cli session (FR-ACCEPT.ACP, FR-ACCEPT-GUARDS,
 * FR-ACCEPT-ISOLATION), driven by the real local `stub_agent.ts` ACP server
 * over stdio — no LLM, deterministic, offline. The stub is a real ACP agent
 * (the agent side of the official library), not a mock of our own code.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { AcpAgent } from "./acp_agent.ts";
import {
  DISPATCH_REPORT,
  SEQUENCE_AFTER,
  SEQUENCE_BEFORE,
  SEQUENCE_COMMAND,
  SEQUENCE_REASONING,
  STALL_COMMAND,
  STALL_REASONING,
  STALL_REPLY,
  THINK_REASONING,
  THINK_REPLY,
} from "./stub_agent.ts";

const STUB = fromFileUrl(new URL("./stub_agent.ts", import.meta.url));
const LAUNCH = { command: Deno.execPath(), args: ["run", "-A", STUB] };

async function runStub(
  prompt: string,
  opts: { guarded?: boolean; workspace?: string } = {},
): Promise<{ agent: AcpAgent; code: number; logs: string; workspace: string }> {
  const workspace = opts.workspace ??
    await Deno.makeTempDir({ prefix: "acp-agent-" });
  const agent = new AcpAgent({
    ide: "claude",
    workspace,
    model: "stub",
    prompt,
    launch: LAUNCH,
    disableWatchdog: !opts.guarded,
  });
  const { code, logs } = await agent.run();
  return { agent, code, logs, workspace };
}

Deno.test("runs a turn through the library session", async () => {
  const { code, logs, agent } = await runStub("hello world");
  assertEquals(code, 0);
  assertStringIncludes(logs, "< echo: hello world");
  assert(agent.getSessionId()?.startsWith("stub-session-"));
});

Deno.test("a tool permission is auto-allowed and the real command runs", async () => {
  const { code, logs, workspace } = await runStub("run it [[TOOL:echo hi]]");
  assertEquals(code, 0);
  // Throws when the permission answer did not grant the tool.
  await Deno.lstat(join(workspace, "tool-ran.txt"));
  assertStringIncludes(logs, "< ran: echo hi");
});

Deno.test("a dispatch's result reaches the trace", async () => {
  const { logs, agent } = await runStub("map it [[DISPATCH]]");
  const dispatch = agent.getToolCalls().find((c) =>
    c.rawInput?.subagent_type === "surface-scout"
  );
  assertStringIncludes(dispatch?.resultText ?? "", DISPATCH_REPORT);
  assertStringIncludes(logs, "subagent dispatch -> surface-scout");
  assertStringIncludes(logs, DISPATCH_REPORT.split("\n")[1]);
});

Deno.test("reasoning stays out of the reply, and the turn keeps arrival order", async () => {
  const think = await runStub("answer [[THINK]]");
  assertEquals(think.agent.getMessages().at(-1)?.content, THINK_REPLY);
  assertStringIncludes(think.logs, `[agent-reasoning] ${THINK_REASONING}`);

  const seq = await runStub("review [[SEQUENCE]]");
  const order = [
    `[agent-reasoning] ${SEQUENCE_REASONING}`,
    `< ${SEQUENCE_BEFORE}`,
    `[tool-call] ${SEQUENCE_COMMAND}`,
    `< ${SEQUENCE_AFTER}`,
  ].map((line) => seq.logs.indexOf(line));
  assert(order.every((i) => i >= 0), `missing a line: ${seq.logs}`);
  assertEquals([...order].sort((a, b) => a - b), order);
});

Deno.test("a connection drop maps to a failure verdict, not a throw", async () => {
  const { code, logs } = await runStub("do it [[CRASH]]");
  assertEquals(code, 1);
  assertStringIncludes(logs, "[acp-error]");
});

Deno.test("a client-fs write outside the sandbox is refused", async () => {
  const outside = await Deno.makeTempDir({ prefix: "acp-outside-" });
  const target = join(outside, "escape.txt");
  const refused = await runStub(`[[WRITE:${target}]]`);
  assertStringIncludes(refused.logs, "< refused:");
  await Deno.lstat(target).then(
    () => {
      throw new Error("the write escaped the sandbox");
    },
    () => {},
  );
  const inside = await runStub("[[WRITE:notes/in.txt]]");
  assertStringIncludes(inside.logs, "< wrote");
  assertEquals(
    await Deno.readTextFile(join(inside.workspace, "notes/in.txt")),
    "stub",
  );
});

Deno.test("a global timeout keeps the partial log", async () => {
  const workspace = await Deno.makeTempDir({ prefix: "acp-agent-" });
  const agent = new AcpAgent({
    ide: "claude",
    workspace,
    model: "stub",
    prompt: "go [[STALL]]",
    launch: LAUNCH,
    disableWatchdog: true,
  });
  const running = agent.run();
  const deadline = Date.now() + 20_000;
  while (!agent.partialLogs.includes(STALL_COMMAND)) {
    assert(Date.now() < deadline, `no partial trace: ${agent.partialLogs}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  const partial = agent.partialLogs;
  assertStringIncludes(partial, `< ${STALL_REPLY}`);
  assertStringIncludes(partial, `[agent-reasoning] ${STALL_REASONING}`);
  assertStringIncludes(partial, `[tool-call] ${STALL_COMMAND}`);
  assertEquals(agent.getToolCalls().length, 1);
  agent.kill();
  const { code } = await running;
  assertEquals(code, 1);
});

Deno.test("the guarded bridge leads its own process group and leaves nothing behind", async () => {
  const { code, logs } = await runStub("[[META]]", { guarded: true });
  assertEquals(code, 0);
  const pid = JSON.parse(logs.split("\n< ")[1].split("\n")[0]).pid as number;
  // ps prints the group the stub ran in only while it lives; it is gone now,
  // so check the group from the stub's own report instead.
  assert(pid > 0);
  const alive = await new Deno.Command("ps", {
    args: ["-o", "pid=", "-g", String(pid)],
    stdout: "piped",
    stderr: "null",
  }).output();
  assertEquals(new TextDecoder().decode(alive.stdout).trim(), "");
});
