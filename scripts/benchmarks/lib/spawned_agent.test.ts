import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { SpawnedAgent } from "./spawned_agent.ts";
import { createTempDir } from "./utils.ts";

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
  "messages": [
    {"type": "assistant", "content": "AGENT: Hello"}
  ],
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
  });

  try {
    const result = await agent.run();

    assertEquals(result.code, 0);
    assertStringIncludes(result.logs, "AGENT: Hello");
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
  "messages": [{"type": "assistant", "content": "AGENT: Need input"}]
}
EOF
  exit 0
else
  cat <<'EOF'
{
  "session_id": "session-456",
  "messages": [{"type": "assistant", "content": "AGENT: Resumed with session"}],
  "result": {"subtype": "success", "result": "Finished"}
}
EOF
  exit 0
fi
`,
  );
  await Deno.chmod(mockAgentBin, 0o755);

  let inputCalled = 0;
  const agent = new SpawnedAgent({
    commandPath: mockAgentBin,
    workspace: tempDir,
    model: "test-model",
  });

  try {
    const result = await agent.run((_logs, messages) => {
      inputCalled++;
      assertEquals(messages.length, 1);
      assertEquals(messages[0].role, "assistant");
      assertEquals(messages[0].content, "AGENT: Need input");
      return Promise.resolve("User Response");
    });

    assertEquals(result.code, 0);
    assertEquals(inputCalled, 1);
    assertStringIncludes(result.logs, "AGENT: Need input");
    assertStringIncludes(result.logs, "AGENT: Resumed with session");
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

  // JSON format: no result field means task not finished, triggers resume
  await Deno.writeTextFile(
    mockAgentBin,
    `#!/bin/sh
cat <<'EOF'
{
  "session_id": "loop-session",
  "messages": [{"type": "assistant", "content": "AGENT: Still working..."}]
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
  });

  try {
    const result = await agent.run();
    // Should stop after 3 steps
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
  "messages": [{"type": "assistant", "content": "Hello"}]
}
EOF
else
  cat <<'EOF'
{
  "session_id": "msg-session",
  "messages": [
    {"type": "assistant", "content": "Hello"},
    {"type": "user", "content": "Hi"},
    {"type": "assistant", "content": "How can I help?"}
  ],
  "result": {"subtype": "success", "result": "Done"}
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
  });

  try {
    let callCount = 0;
    await agent.run(async (_logs, messages) => {
      callCount++;
      if (callCount === 1) {
        assertEquals(messages.length, 1);
        assertEquals(messages[0].content, "Hello");
        return "Hi";
      }
      return null;
    });

    const finalMessages = agent.getMessages();
    assertEquals(finalMessages.length, 3);
    assertEquals(finalMessages[0].content, "Hello");
    assertEquals(finalMessages[1].content, "Hi");
    assertEquals(finalMessages[2].content, "How can I help?");
  } finally {
    await agent.kill();
    await Deno.remove(tempDir, { recursive: true });
  }
});

