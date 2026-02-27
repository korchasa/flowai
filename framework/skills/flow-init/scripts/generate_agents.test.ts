import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { analyzeProject } from "./generate_agents.ts";
import type { ProjectInfo } from "./generate_agents.ts";

// ---------------------------------------------------------------------------
// analyzeProject
// ---------------------------------------------------------------------------

Deno.test("analyzeProject detects Deno project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "deno.json"), "{}");
    await Deno.writeTextFile(join(tmpDir, "main.ts"), "console.log('hi')");
    const result: ProjectInfo = await analyzeProject(tmpDir);
    assertEquals(result.stack.includes("Deno"), true);
    assertEquals(result.is_new, false);
    assertEquals(result.files_count >= 2, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject detects empty project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result: ProjectInfo = await analyzeProject(tmpDir);
    assertEquals(result.is_new, true);
    assertEquals(result.stack.length, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject detects Node.js project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "package.json"), '{"name":"test"}');
    await Deno.writeTextFile(join(tmpDir, "index.js"), "");
    const result: ProjectInfo = await analyzeProject(tmpDir);
    assertEquals(result.stack.includes("Node.js"), true);
    assertEquals(result.is_new, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject detects Go project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "go.mod"), "module test");
    await Deno.writeTextFile(join(tmpDir, "main.go"), "package main");
    const result: ProjectInfo = await analyzeProject(tmpDir);
    assertEquals(result.stack.includes("Go"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject reads README content", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(tmpDir, "README.md"),
      "# My Project\nDescription here",
    );
    const result: ProjectInfo = await analyzeProject(tmpDir);
    assertEquals(result.readme_content.includes("# My Project"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject skips .git and node_modules", async () => {
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
    const result: ProjectInfo = await analyzeProject(tmpDir);
    // Only src.ts should be counted, not .git/config or node_modules files
    assertEquals(result.files_count, 1);
    assertEquals(result.file_tree.includes("src.ts"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject detects multiple stacks", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "deno.json"), "{}");
    await Deno.writeTextFile(join(tmpDir, "requirements.txt"), "flask");
    await Deno.writeTextFile(join(tmpDir, "main.ts"), "");
    const result: ProjectInfo = await analyzeProject(tmpDir);
    assertEquals(result.stack.includes("Deno"), true);
    assertEquals(result.stack.includes("Python"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("analyzeProject exports only ProjectInfo type", () => {
  // Verify the shape of ProjectInfo has expected fields
  const info: ProjectInfo = {
    is_new: false,
    stack: ["Deno"],
    files_count: 10,
    root_dir: "/tmp",
    readme_content: "",
    file_tree: [],
  };
  assertEquals(typeof info.is_new, "boolean");
  assertEquals(Array.isArray(info.stack), true);
  assertEquals(typeof info.files_count, "number");
  assertEquals(typeof info.root_dir, "string");
  assertEquals(typeof info.readme_content, "string");
  assertEquals(Array.isArray(info.file_tree), true);
});
