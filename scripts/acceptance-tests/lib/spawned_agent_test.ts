import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";

// SpawnedAgent normally wraps every spawn in `python3 setpgrp_exec.py …` so
// the resource watchdog can group-kill the agent's tree. That extra process
// hop occasionally races Deno's per-test resource leak detector when mock
// scripts complete in a few hundred ms (orphan stdout pipes between exec
// and reaper). Watchdog/group-isolation behaviour has its own dedicated
// suite (`process_watchdog_test.ts`); here we just want to test
// SpawnedAgent's lifecycle. Each test passes `disableWatchdog: true` to
// SpawnedAgent (programmatic option; there is no env-var bypass).

import { SpawnedAgent } from "./spawned_agent.ts";
import { createTempDir } from "./utils.ts";
import { CursorAdapter } from "./adapters/cursor.ts";

// Unit tests use mock shell scripts that output cursor-format JSON
const adapter = new CursorAdapter();

Deno.test("SpawnedAgent - Basic Execution", async () => {
  const tempDir = await createTempDir("agent");
  const mockAgentBin = join(tempDir, "mock-agent.sh");

  // JSON format: single JSON object output
  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
cat <<'EOF'
{
  "session_id": "test-session-123",
  "result": {"subtype": "success", "result": "Done"}
}
EOF
exit 0
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
    adapter,
    disableWatchdog: true,
  });

  try {
    const result = await agent.run();

    assertEquals(result.code, 0);
    assertStringIncludes(result.logs, "Done");
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("SpawnedAgent - Lifecycle with Resume", async () => {
  const tempDir = await createTempDir("agent");
  const mockAgentBin = join(tempDir, "mock-agent-resume.sh");

  // This mock simulates an agent that needs input on first run and finishes on second
  // JSON format: single JSON object output
  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
# Check if we are resuming
RESUME=false
for arg in "$@"; do
  if [ "$arg" = "--resume" ]; then RESUME=true; fi
done

  if [ "$RESUME" = "false" ]; then
  cat <<'EOF'
{
  "session_id": "session-456",
  "result": {"subtype": "success", "result": "AGENT: Need input"}
}
EOF
  exit 0
else
  cat <<'EOF'
{
  "session_id": "session-456",
  "result": {"subtype": "success", "result": "Finished"}
}
EOF
  exit 0
fi
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
    adapter,
    disableWatchdog: true,
  });

  try {
    let inputCalled = 0;
    const result = await agent.run({
      getResponse: (_messages) => {
        inputCalled++;
        return Promise.resolve(inputCalled === 1 ? "User Response" : null);
      },
    });

    assertEquals(result.code, 0);
    // getResponse is called after EACH step:
    // - Step 1: agent returns "Need input" -> getResponse called -> returns "User Response"
    // - Step 2: agent returns "Finished" -> getResponse called -> returns null -> exit
    assertEquals(inputCalled, 2);
    assertStringIncludes(result.logs, "AGENT: Need input");
    assertStringIncludes(result.logs, "Finished");
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("SpawnedAgent - JSON Chunking", async () => {
  const tempDir = await createTempDir("agent");
  const mockAgentBin = join(tempDir, "mock-agent-chunks.sh");

  // Simulate JSON arriving in chunks (network delay simulation)
  // JSON format: single JSON object that may arrive in parts
  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
printf '{"session_id": "chunk-'
sleep 0.1
printf '123", "messages": [], '
sleep 0.1
printf '"result": {"subtype": "success", "result": "Done"}}'
exit 0
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
    adapter,
    disableWatchdog: true,
  });

  try {
    const result = await agent.run();
    assertEquals(result.code, 0);
    // Verify that JSON was parsed correctly despite chunked arrival
    assertStringIncludes(result.logs, "Done");
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("SpawnedAgent - Max Steps", async () => {
  const tempDir = await createTempDir("agent");
  const mockAgentBin = join(tempDir, "mock-agent-loop.sh");

  // JSON format: agent always returns success, but emulator decides to continue
  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
cat <<'EOF'
{
  "session_id": "loop-session",
  "result": {"subtype": "success", "result": "AGENT: Still working..."}
}
EOF
exit 0
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
    maxSteps: 3,
    adapter,
    disableWatchdog: true,
  });

  try {
    // Without userEmulator, loop exits after first step (documented behavior).
    // To test maxSteps limit, we need an emulator that always continues.
    let stepCount = 0;
    const result = await agent.run({
      getResponse: () => {
        stepCount++;
        // Return "continue" for first 2 calls, then null to stop
        // This allows 3 agent steps total (initial + 2 resumes)
        return Promise.resolve(stepCount < 3 ? "continue" : null);
      },
    });
    // Should have 3 occurrences of the agent message (one per step)
    const steps = (result.logs.match(/AGENT: Still working/g) || []).length;
    assertEquals(steps, 3);
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("SpawnedAgent - Environment Variables", async () => {
  const tempDir = await createTempDir("agent");
  const mockAgentBin = join(tempDir, "mock-agent-env.sh");

  // JSON format with env var output before JSON
  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
echo "MY_VAR=$MY_CUSTOM_VAR"
cat <<'EOF'
{
  "session_id": "env-test",
  "messages": [],
  "result": {"subtype": "success"}
}
EOF
exit 0
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
    env: { "MY_CUSTOM_VAR": "hello-world" },
    adapter,
    disableWatchdog: true,
  });

  try {
    const result = await agent.run();
    assertStringIncludes(result.logs, "MY_VAR=hello-world");
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("SpawnedAgent - Error Handling (Invalid Command)", async () => {
  const tempDir = await createTempDir("agent");
  const agent = new SpawnedAgent({
    commandPath: "/non/existent/path/to/agent",
    workspace: tempDir,
    model: "test-model",
    adapter,
    disableWatchdog: true,
  });

  // In the current implementation, monitorPty simply logs the error to the console and performs cleanup(0)
  // But Pty might throw an error at startup.
  // Verify that run() completes (at least with an error or empty result)
  try {
    const _result = await agent.run();
    // In the current implementation, Pty from @sigma/pty-ffi can behave differently
    // If the command is not found, it usually terminates with a non-zero code or an error
  } catch (_e) {
    // Expect some kind of error
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("SpawnedAgent - Message Accumulation", async () => {
  const tempDir = await createTempDir("agent-messages");
  const mockAgentBin = join(tempDir, "mock-agent-messages.sh");

  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
RESUME=false
for arg in "$@"; do
  if [ "$arg" = "--resume" ]; then RESUME=true; fi
done

if [ "$RESUME" = "false" ]; then
  cat <<'EOF'
{
  "session_id": "msg-session",
  "result": {"subtype": "success", "result": "Hello"}
}
EOF
else
  cat <<'EOF'
{
  "session_id": "msg-session",
  "result": {"subtype": "success", "result": "How can I help?"}
}
EOF
fi
exit 0
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
    prompt: "initial prompt",
    adapter,
    disableWatchdog: true,
  });

  try {
    let callCount = 0;
    await agent.run({
      getResponse: (messages) => {
        callCount++;
        if (callCount === 1) {
          assertEquals(messages.length, 2);
          assertEquals(messages[0].content, "initial prompt");
          assertEquals(messages[1].content, "Hello");
          return Promise.resolve("Hi");
        }
        return Promise.resolve(null);
      },
    });

    const finalMessages = agent.getMessages();
    assertEquals(finalMessages.length, 4);
    assertEquals(finalMessages[0].content, "initial prompt");
    assertEquals(finalMessages[1].content, "Hello");
    assertEquals(finalMessages[2].content, "Hi");
    assertEquals(finalMessages[3].content, "How can I help?");
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});
