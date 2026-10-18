import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { validateCommand } from "./validate_command.ts";

async function withCommandFile(
  fileName: string,
  content: string,
  fn: (path: string) => void | Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir();
  try {
    const path = join(dir, fileName);
    await Deno.writeTextFile(path, content);
    await fn(path);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

const CLAUDE_OK =
  "---\ndescription: Manage Docker Compose services\nargument-hint: '[action] [service]'\n---\nRun $ARGUMENTS\n";

Deno.test("validate: missing file returns error", () => {
  const [valid, msg] = validateCommand("/nonexistent/dir/cmd.md", "claude");
  assertEquals(valid, false);
  assertEquals(msg, "Command file not found: /nonexistent/dir/cmd.md");
});

Deno.test("validate: a directory is not a command file", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const [valid, msg] = validateCommand(dir, "claude");
    assertEquals(valid, false);
    assertEquals(
      msg,
      "A command is one Markdown file, not a directory. Write .<ide>/commands/<name>.md; a SKILL.md package belongs to skill authoring.",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("validate: non-.md file returns error", async () => {
  await withCommandFile("cmd.txt", CLAUDE_OK, (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, false);
    assertEquals(msg, "Command file must end in .md");
  });
});

Deno.test("validate: unknown IDE returns error", async () => {
  await withCommandFile("cmd.md", CLAUDE_OK, (path) => {
    const [valid, msg] = validateCommand(path, "vscode");
    assertEquals(valid, false);
    assertEquals(
      msg,
      "Unknown IDE 'vscode'. Use one of: claude, cursor, opencode",
    );
  });
});

Deno.test("validate: command name must be hyphen-case", async () => {
  await withCommandFile("Docker_Compose.md", CLAUDE_OK, (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, false);
    assertEquals(msg.includes("hyphen-case"), true);
  });
});

Deno.test("validate: command name with consecutive hyphens returns error", async () => {
  await withCommandFile("docker--compose.md", CLAUDE_OK, (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, false);
    assertEquals(msg.includes("consecutive hyphens"), true);
  });
});

Deno.test("validate: valid Claude Code command", async () => {
  await withCommandFile("docker-compose.md", CLAUDE_OK, (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, true);
    assertEquals(msg, "Command is valid!");
  });
});

Deno.test("validate: Claude Code command without frontmatter returns error", async () => {
  await withCommandFile("cmd.md", "Run the release checklist\n", (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, false);
    assertEquals(
      msg,
      "claude commands need YAML frontmatter with a 'description'",
    );
  });
});

Deno.test("validate: unquoted argument-hint list is caught as non-string", async () => {
  await withCommandFile(
    "cmd.md",
    "---\ndescription: ok\nargument-hint: [action] [service]\n---\nbody\n",
    (path) => {
      const [valid, msg] = validateCommand(path, "claude");
      assertEquals(valid, false);
      assertEquals(msg.startsWith("Invalid YAML in frontmatter:"), true);
    },
  );
});

Deno.test("validate: argument-hint parsed as a list returns error", async () => {
  await withCommandFile(
    "cmd.md",
    "---\ndescription: ok\nargument-hint: [action]\n---\nbody\n",
    (path) => {
      const [valid, msg] = validateCommand(path, "claude");
      assertEquals(valid, false);
      assertEquals(
        msg,
        "'argument-hint' must be a string, got list. Quote it: argument-hint: '[action] [service]'",
      );
    },
  );
});

Deno.test("validate: missing description returns error", async () => {
  await withCommandFile("cmd.md", "---\nmodel: haiku\n---\nbody\n", (path) => {
    const [valid, msg] = validateCommand(path, "opencode");
    assertEquals(valid, false);
    assertEquals(msg, "Missing 'description' in frontmatter");
  });
});

Deno.test("validate: frontmatter that is not a mapping returns error", async () => {
  await withCommandFile("cmd.md", "---\n- a\n- b\n---\nbody\n", (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, false);
    assertEquals(msg, "Frontmatter must be a YAML mapping");
  });
});

Deno.test("validate: SKILL.md-style name field is rejected", async () => {
  await withCommandFile(
    "cmd.md",
    "---\nname: cmd\ndescription: ok\n---\nbody\n",
    (path) => {
      const [valid, msg] = validateCommand(path, "claude");
      assertEquals(valid, false);
      assertEquals(
        msg,
        "Unexpected key(s) in claude command frontmatter: name. Allowed: allowed-tools, argument-hint, description, disable-model-invocation, model",
      );
    },
  );
});

Deno.test("validate: OpenCode keys are accepted for OpenCode", async () => {
  await withCommandFile(
    "cmd.md",
    "---\ndescription: ok\nagent: build\nmodel: x\nsubtask: true\n---\nRun $ARGUMENTS\n",
    (path) => {
      const [valid] = validateCommand(path, "opencode");
      assertEquals(valid, true);
    },
  );
});

Deno.test("validate: Cursor command is plain Markdown", async () => {
  await withCommandFile(
    "cmd.md",
    "# Release\n\nRun the checklist.\n",
    (path) => {
      const [valid, msg] = validateCommand(path, "cursor");
      assertEquals(valid, true);
      assertEquals(msg, "Command is valid!");
    },
  );
});

Deno.test("validate: Cursor command with frontmatter returns error", async () => {
  await withCommandFile("cmd.md", CLAUDE_OK, (path) => {
    const [valid, msg] = validateCommand(path, "cursor");
    assertEquals(valid, false);
    assertEquals(
      msg,
      "Cursor commands are plain Markdown; remove the YAML frontmatter",
    );
  });
});

Deno.test("validate: empty body returns error", async () => {
  await withCommandFile("cmd.md", "---\ndescription: ok\n---\n\n", (path) => {
    const [valid, msg] = validateCommand(path, "claude");
    assertEquals(valid, false);
    assertEquals(msg, "Command body is empty");
  });
});

Deno.test("validate: Claude Code bang-backtick after whitespace without allowed-tools returns error", async () => {
  await withCommandFile(
    "cmd.md",
    "---\ndescription: ok\n---\nStatus: !`docker compose ps`\n",
    (path) => {
      const [valid, msg] = validateCommand(path, "claude");
      assertEquals(valid, false);
      assertEquals(msg.startsWith("Line 4: Claude Code runs"), true);
    },
  );
});

Deno.test("validate: Claude Code bang-backtick with allowed-tools is accepted", async () => {
  await withCommandFile(
    "cmd.md",
    "---\ndescription: ok\nallowed-tools: Bash(docker compose ps:*)\n---\nStatus: !`docker compose ps`\n",
    (path) => {
      const [valid] = validateCommand(path, "claude");
      assertEquals(valid, true);
    },
  );
});

Deno.test("validate: bang glued to the preceding character is not shell interpolation", async () => {
  await withCommandFile(
    "cmd.md",
    "---\ndescription: ok\n---\nNever write x!`y` here.\n",
    (path) => {
      const [valid] = validateCommand(path, "claude");
      assertEquals(valid, true);
    },
  );
});
