import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { analyzeProject } from "./generate_agents.ts";
import type { AnalysisResult } from "./generate_agents.ts";

// ---------------------------------------------------------------------------
// Stack detection
// ---------------------------------------------------------------------------

Deno.test("detects Deno project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "deno.json"), "{}");
    await Deno.writeTextFile(join(tmpDir, "main.ts"), "console.log('hi')");
    const r: AnalysisResult = await analyzeProject(tmpDir);
    assertEquals(r.stack.includes("Deno"), true);
    assertEquals(r.is_new, false);
    assertEquals(r.files_count >= 2, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects empty project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const r = await analyzeProject(tmpDir);
    assertEquals(r.is_new, true);
    assertEquals(r.stack.length, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects Node.js project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "package.json"), '{"name":"test"}');
    await Deno.writeTextFile(join(tmpDir, "index.js"), "");
    const r = await analyzeProject(tmpDir);
    assertEquals(r.stack.includes("Node.js"), true);
    assertEquals(r.is_new, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects Go project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "go.mod"), "module test");
    await Deno.writeTextFile(join(tmpDir, "main.go"), "package main");
    const r = await analyzeProject(tmpDir);
    assertEquals(r.stack.includes("Go"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("reads README content", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(tmpDir, "README.md"),
      "# My Project\nDescription here",
    );
    const r = await analyzeProject(tmpDir);
    assertEquals(r.readme_content.includes("# My Project"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("skips .git and node_modules", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(tmpDir, ".git"), { recursive: true });
    await Deno.writeTextFile(join(tmpDir, ".git", "config"), "git stuff");
    await Deno.mkdir(join(tmpDir, "node_modules", "pkg"), { recursive: true });
    await Deno.writeTextFile(
      join(tmpDir, "node_modules", "pkg", "index.js"),
      "",
    );
    await Deno.writeTextFile(join(tmpDir, "src.ts"), "code");
    const r = await analyzeProject(tmpDir);
    assertEquals(r.files_count, 1);
    assertEquals(r.file_tree.includes("src.ts"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects multiple stacks", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "deno.json"), "{}");
    await Deno.writeTextFile(join(tmpDir, "requirements.txt"), "flask");
    await Deno.writeTextFile(join(tmpDir, "main.ts"), "");
    const r = await analyzeProject(tmpDir);
    assertEquals(r.stack.includes("Deno"), true);
    assertEquals(r.stack.includes("Python"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// Inventory (component detection)
// ---------------------------------------------------------------------------

Deno.test("reports all missing in empty dir", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.root_agents_md.exists, false);
    assertEquals(r.inventory.claude_md.exists, false);
    assertEquals(r.inventory.documents_dir, false);
    assertEquals(r.inventory.scripts_dir, false);
    assertEquals(r.inventory.devcontainer_dir, false);
    assertEquals(r.inventory.opencode_json.exists, false);
    assertEquals(r.inventory.legacy_layout_detected, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects existing AGENTS.md files", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.mkdir(join(tmpDir, "documents"), { recursive: true });
    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.root_agents_md.exists, true);
    assertEquals(r.inventory.root_agents_md.is_symlink, false);
    assertEquals(r.inventory.documents_dir, true);
    assertEquals(r.inventory.legacy_layout_detected, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects CLAUDE.md symlink", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.symlink("AGENTS.md", join(tmpDir, "CLAUDE.md"));
    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.claude_md.exists, true);
    assertEquals(r.inventory.claude_md.is_symlink, true);
    assertEquals(r.inventory.claude_md.symlink_target, "AGENTS.md");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects CLAUDE.md as regular file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "CLAUDE.md"), "# not a symlink");
    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.claude_md.exists, true);
    assertEquals(r.inventory.claude_md.is_symlink, false);
    assertEquals(r.inventory.claude_md.symlink_target, "");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("checks opencode.json globs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(tmpDir, "opencode.json"),
      JSON.stringify({
        instructions: ["documents/AGENTS.md", "scripts/AGENTS.md"],
      }),
    );
    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.opencode_json.exists, true);
    assertEquals(r.inventory.opencode_json.has_subdirectory_globs, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects missing opencode globs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(tmpDir, "opencode.json"),
      JSON.stringify({ instructions: [] }),
    );
    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.opencode_json.exists, true);
    assertEquals(r.inventory.opencode_json.has_subdirectory_globs, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// Legacy layout detection
// ---------------------------------------------------------------------------

Deno.test("detects legacy three-file layout", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.symlink("AGENTS.md", join(tmpDir, "CLAUDE.md"));
    await Deno.mkdir(join(tmpDir, "documents"), { recursive: true });
    await Deno.writeTextFile(
      join(tmpDir, "documents", "AGENTS.md"),
      "# docs",
    );
    await Deno.mkdir(join(tmpDir, "scripts"), { recursive: true });
    await Deno.writeTextFile(
      join(tmpDir, "scripts", "AGENTS.md"),
      "# scripts",
    );

    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.legacy_layout_detected, true);
    // Verification still passes — legacy layout is informational, not a blocker
    assertEquals(r.verification.passed, true);
    // Should contain an informational message about legacy layout
    const legacyCheck = r.verification.checks.find((c) =>
      c.message.includes("Legacy")
    );
    assertEquals(legacyCheck !== undefined, true);
    assertEquals(legacyCheck?.ok, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects legacy layout with only documents/AGENTS.md", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.mkdir(join(tmpDir, "documents"), { recursive: true });
    await Deno.writeTextFile(
      join(tmpDir, "documents", "AGENTS.md"),
      "# docs",
    );

    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.legacy_layout_detected, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("detects legacy layout with only scripts/AGENTS.md", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.mkdir(join(tmpDir, "scripts"), { recursive: true });
    await Deno.writeTextFile(
      join(tmpDir, "scripts", "AGENTS.md"),
      "# scripts",
    );

    const r = await analyzeProject(tmpDir);
    assertEquals(r.inventory.legacy_layout_detected, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

Deno.test("verification fails on empty dir", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const r = await analyzeProject(tmpDir);
    assertEquals(r.verification.passed, false);
    assertEquals(r.verification.checks.length > 0, true);
    assertEquals(r.verification.checks.some((c) => !c.ok), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verification passes with complete setup", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    // Only need root AGENTS.md + root CLAUDE.md symlink + documents/ directory
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.symlink("AGENTS.md", join(tmpDir, "CLAUDE.md"));
    await Deno.mkdir(join(tmpDir, "documents"), { recursive: true });

    const r = await analyzeProject(tmpDir);
    assertEquals(r.verification.passed, true);
    assertEquals(r.verification.checks.every((c) => c.ok), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verification detects wrong CLAUDE.md symlink target", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "AGENTS.md"), "# rules");
    await Deno.writeTextFile(join(tmpDir, "OTHER.md"), "# other");
    await Deno.symlink("OTHER.md", join(tmpDir, "CLAUDE.md"));
    await Deno.mkdir(join(tmpDir, "documents"), { recursive: true });

    const r = await analyzeProject(tmpDir);
    assertEquals(r.verification.passed, false);
    const symlinkCheck = r.verification.checks.find((c) =>
      c.message.includes("CLAUDE.md")
    );
    assertEquals(symlinkCheck?.ok, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
