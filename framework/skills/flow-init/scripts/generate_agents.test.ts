import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import {
  analyzeProject,
  buildDevCommands,
  buildToolingStack,
  buildVarMap,
  buildVisionContent,
  computeUnifiedDiff,
  extractPreserved,
  renderAll,
  renderTemplate,
} from "./generate_agents.ts";
import type { InterviewData, ProjectInfo } from "./generate_agents.ts";

// ---------------------------------------------------------------------------
// buildVisionContent
// ---------------------------------------------------------------------------

Deno.test("buildVisionContent returns 'No vision provided.' when empty", () => {
  assertEquals(buildVisionContent({}), "No vision provided.");
});

Deno.test("buildVisionContent includes all parts", () => {
  const data: InterviewData = {
    vision_statement: "World domination",
    target_audience: "Everyone",
    problem_statement: "Boredom",
    solution_differentiators: "Fun",
    risks_assumptions: "None",
  };
  const result = buildVisionContent(data);
  assertStringIncludes(result, "### Vision Statement");
  assertStringIncludes(result, "World domination");
  assertStringIncludes(result, "### Target Audience");
  assertStringIncludes(result, "Everyone");
});

// ---------------------------------------------------------------------------
// buildDevCommands
// ---------------------------------------------------------------------------

Deno.test("buildDevCommands for Deno stack", () => {
  const result = buildDevCommands(["Deno"]);
  assertStringIncludes(result, "deno task");
});

Deno.test("buildDevCommands for empty stack", () => {
  assertEquals(buildDevCommands([]), "- No commands detected");
});

Deno.test("buildDevCommands for mixed stack", () => {
  const result = buildDevCommands(["Deno", "Go"]);
  assertStringIncludes(result, "deno task");
  assertStringIncludes(result, "go run");
});

// ---------------------------------------------------------------------------
// buildToolingStack
// ---------------------------------------------------------------------------

Deno.test("buildToolingStack formats list", () => {
  assertEquals(buildToolingStack(["Deno", "TypeScript"]), "- Deno\n- TypeScript");
});

Deno.test("buildToolingStack empty returns Unknown", () => {
  assertEquals(buildToolingStack([]), "- Unknown");
});

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

Deno.test("renderTemplate replaces placeholders", () => {
  const template = "Name: {{NAME}}, Stack: {{STACK}}";
  const result = renderTemplate(template, ["NAME", "STACK"], {
    NAME: "MyProject",
    STACK: "Deno",
  });
  assertEquals(result, "Name: MyProject, Stack: Deno");
});

Deno.test("renderTemplate handles missing vars", () => {
  const template = "Name: {{NAME}}, Missing: {{MISSING}}";
  const result = renderTemplate(template, ["NAME", "MISSING"], { NAME: "X" });
  assertEquals(result, "Name: X, Missing: ");
});

// ---------------------------------------------------------------------------
// extractPreserved
// ---------------------------------------------------------------------------

Deno.test("extractPreserved extracts content between markers", () => {
  const content = `# YOU MUST
- Rule 1

---
My custom rules here
Another custom rule

## Project Information
- Name: Test`;

  const result = extractPreserved(content, {
    type: "markers",
    start: "---",
    end: "## ",
    inject_as: "PROJECT_RULES",
  });
  assertEquals(result, "My custom rules here\nAnother custom rule");
});

Deno.test("extractPreserved returns empty for no markers", () => {
  const result = extractPreserved("no markers here", {
    type: "markers",
    start: "---",
    end: "## ",
    inject_as: "PROJECT_RULES",
  });
  assertEquals(result, "");
});

Deno.test("extractPreserved returns empty for null preserve", () => {
  assertEquals(extractPreserved("any content", null), "");
});

Deno.test("extractPreserved ignores --- inside fenced code blocks", () => {
  const content = `# Title

\`\`\`markdown
---
This is inside a code block
\`\`\`

---
ACTUAL PRESERVED CONTENT

## Next Section`;

  const result = extractPreserved(content, {
    type: "markers",
    start: "---",
    end: "## ",
    inject_as: "PROJECT_RULES",
  });
  assertEquals(result, "ACTUAL PRESERVED CONTENT");
});

// ---------------------------------------------------------------------------
// computeUnifiedDiff
// ---------------------------------------------------------------------------

Deno.test("computeUnifiedDiff shows changes", () => {
  const old = "line1\nline2\nline3";
  const new_ = "line1\nmodified\nline3";
  const diff = computeUnifiedDiff(old, new_, "test.md");
  assertStringIncludes(diff, "--- a/test.md");
  assertStringIncludes(diff, "+++ b/test.md");
  assertStringIncludes(diff, "-line2");
  assertStringIncludes(diff, "+modified");
});

Deno.test("computeUnifiedDiff no changes produces no hunks", () => {
  const content = "same\ncontent";
  const diff = computeUnifiedDiff(content, content, "test.md");
  // Only header lines, no hunks
  assertEquals(diff.includes("@@"), false);
});

Deno.test("computeUnifiedDiff produces separate hunks for distant changes", () => {
  // 20 lines, changes at line 2 and line 18 — should produce 2 hunks
  const oldLines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`);
  const newLines = [...oldLines];
  newLines[1] = "CHANGED2";
  newLines[17] = "CHANGED18";
  const diff = computeUnifiedDiff(oldLines.join("\n"), newLines.join("\n"), "test.md");
  const hunkHeaders = diff.split("\n").filter(l => l.startsWith("@@"));
  assertEquals(hunkHeaders.length, 2, "Should have 2 separate hunks for distant changes");
});

// ---------------------------------------------------------------------------
// buildVarMap
// ---------------------------------------------------------------------------

Deno.test("buildVarMap merges stacks", () => {
  const data: InterviewData = {
    project_name: "TestProj",
    stack: ["TypeScript"],
  };
  const info: ProjectInfo = {
    is_new: false,
    stack: ["Deno"],
    files_count: 10,
    root_dir: "/tmp",
    readme_content: "",
    file_tree: [],
  };
  const map = buildVarMap(data, info);
  assertEquals(map.PROJECT_NAME, "TestProj");
  // Merged stack should include both
  assertStringIncludes(map.TOOLING_STACK, "Deno");
  assertStringIncludes(map.TOOLING_STACK, "TypeScript");
});

// ---------------------------------------------------------------------------
// analyzeProject
// ---------------------------------------------------------------------------

Deno.test("analyzeProject detects Deno project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "deno.json"), "{}");
    await Deno.writeTextFile(join(tmpDir, "main.ts"), "console.log('hi')");
    const result = await analyzeProject(tmpDir);
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
    const result = await analyzeProject(tmpDir);
    assertEquals(result.is_new, true);
    assertEquals(result.stack.length, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// renderAll (integration)
// ---------------------------------------------------------------------------

Deno.test("renderAll creates files for empty project", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    // Create a minimal manifest
    const manifestDir = join(tmpDir, "skill", "assets");
    await Deno.mkdir(manifestDir, { recursive: true });

    // Write a simple template
    await Deno.writeTextFile(
      join(manifestDir, "root.template.md"),
      "# Project: {{PROJECT_NAME}}\n",
    );

    const manifest = {
      version: 1,
      files: [
        {
          path: "AGENTS.md",
          template: "assets/root.template.md",
          vars: ["PROJECT_NAME"],
          preserve: null,
          update: "diff-confirm",
        },
      ],
      generated_by_llm: [],
      ide_compat: {},
    };

    const manifestPath = join(tmpDir, "skill", "manifest.json");
    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest));

    // Write interview data
    const dataPath = join(tmpDir, "data.json");
    await Deno.writeTextFile(dataPath, JSON.stringify({ project_name: "TestApp" }));

    // Write empty project_info.json
    const projectInfoPath = join(tmpDir, "project_info.json");
    await Deno.writeTextFile(
      projectInfoPath,
      JSON.stringify({ is_new: true, stack: [], files_count: 0, root_dir: tmpDir, readme_content: "", file_tree: [] }),
    );

    const projectRoot = join(tmpDir, "project");
    await Deno.mkdir(projectRoot, { recursive: true });

    const results = await renderAll(manifestPath, dataPath, projectRoot);
    assertEquals(results.length, 1);
    assertEquals(results[0].path, "AGENTS.md");
    assertEquals(results[0].status, "created");
    assertStringIncludes(results[0].content!, "# Project: TestApp");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("renderAll detects diff for existing file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const manifestDir = join(tmpDir, "skill", "assets");
    await Deno.mkdir(manifestDir, { recursive: true });

    await Deno.writeTextFile(
      join(manifestDir, "root.template.md"),
      "# Project: {{PROJECT_NAME}}\nNew content\n",
    );

    const manifest = {
      version: 1,
      files: [
        {
          path: "AGENTS.md",
          template: "assets/root.template.md",
          vars: ["PROJECT_NAME"],
          preserve: null,
          update: "diff-confirm",
        },
      ],
      generated_by_llm: [],
      ide_compat: {},
    };

    const manifestPath = join(tmpDir, "skill", "manifest.json");
    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest));

    const dataPath = join(tmpDir, "data.json");
    await Deno.writeTextFile(dataPath, JSON.stringify({ project_name: "TestApp" }));

    const projectRoot = join(tmpDir, "project");
    await Deno.mkdir(projectRoot, { recursive: true });

    // Create existing AGENTS.md with different content
    await Deno.writeTextFile(join(projectRoot, "AGENTS.md"), "# Project: TestApp\nOld content\n");

    const results = await renderAll(manifestPath, dataPath, projectRoot);
    assertEquals(results.length, 1);
    assertEquals(results[0].status, "diff");
    assertStringIncludes(results[0].diff!, "-Old content");
    assertStringIncludes(results[0].diff!, "+New content");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("renderAll preserves PROJECT_RULES from existing file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const manifestDir = join(tmpDir, "skill", "assets");
    await Deno.mkdir(manifestDir, { recursive: true });

    await Deno.writeTextFile(
      join(manifestDir, "root.template.md"),
      "# YOU MUST\n- Rule\n\n---\n{{PROJECT_RULES}}\n\n## Project Information\n- Name: {{PROJECT_NAME}}\n",
    );

    const manifest = {
      version: 1,
      files: [
        {
          path: "AGENTS.md",
          template: "assets/root.template.md",
          vars: ["PROJECT_NAME", "PROJECT_RULES"],
          preserve: {
            type: "markers" as const,
            start: "---",
            end: "## ",
            inject_as: "PROJECT_RULES",
          },
          update: "diff-confirm" as const,
        },
      ],
      generated_by_llm: [],
      ide_compat: {},
    };

    const manifestPath = join(tmpDir, "skill", "manifest.json");
    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest));

    const dataPath = join(tmpDir, "data.json");
    await Deno.writeTextFile(dataPath, JSON.stringify({ project_name: "TestApp" }));

    const projectRoot = join(tmpDir, "project");
    await Deno.mkdir(projectRoot, { recursive: true });

    // Existing AGENTS.md with custom rules
    await Deno.writeTextFile(
      join(projectRoot, "AGENTS.md"),
      "# YOU MUST\n- Old Rule\n\n---\nMY CUSTOM PROJECT RULE\nANOTHER RULE\n\n## Project Information\n- Name: OldName\n",
    );

    const results = await renderAll(manifestPath, dataPath, projectRoot);
    assertEquals(results.length, 1);
    // The rendered content should contain the preserved rules
    assertStringIncludes(results[0].content!, "MY CUSTOM PROJECT RULE");
    assertStringIncludes(results[0].content!, "ANOTHER RULE");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
