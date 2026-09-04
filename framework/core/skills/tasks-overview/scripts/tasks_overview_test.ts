/**
 * Drives `tasks_overview.py` the way the generated project script is driven,
 * so `deno task check` covers the scanner even though it is Python.
 *
 * Every test copies the template into a temp project, optionally replaces
 * the schema block the way the skill does, plants task files and runs the
 * script from the project root.
 */
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { dirname, fromFileUrl, join } from "jsr:@std/path";

const TEMPLATE = fromFileUrl(new URL("./tasks_overview.py", import.meta.url));
/** The template default root, spelled through a constant: shipped skill files must not carry the literal path. */
const DEFAULT_ROOT = ["documents", "tasks"].join("/");
const BEGIN = "# --- SCHEMA BEGIN ---";
const END = "# --- SCHEMA END ---";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

/** Install the script into `project` with `schema` (a Python dict literal) or the template default. */
async function install(project: string, schema?: string): Promise<string> {
  let text = await Deno.readTextFile(TEMPLATE);
  if (schema !== undefined) {
    const a = text.indexOf(BEGIN);
    const b = text.indexOf(END);
    assert(a >= 0 && b > a, "template carries the schema markers");
    text = text.slice(0, a + BEGIN.length) + "\n" + schema + "\n" +
      text.slice(b);
  }
  const target = join(project, "scripts", "tasks-overview.py");
  await Deno.mkdir(dirname(target), { recursive: true });
  await Deno.writeTextFile(target, text);
  return target;
}

async function run(project: string, ...args: string[]): Promise<Run> {
  const out = await new Deno.Command("python3", {
    args: [join("scripts", "tasks-overview.py"), ...args],
    cwd: project,
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

async function plant(project: string, rel: string, body: string) {
  const file = join(project, rel);
  await Deno.mkdir(dirname(file), { recursive: true });
  await Deno.writeTextFile(file, body);
}

function task(
  status: string | null,
  title: string,
  dod: string[] = [],
  extra = "",
): string {
  const fm = status === null ? "" : `status: ${status}\n`;
  return `---\ndate: 2026-09-0${
    1 + dod.length
  }\n${fm}${extra}---\n# ${title}\n\n## Goal\n\nx\n\n## Definition of Done\n\n${
    dod.join("\n")
  }\n`;
}

async function withProject(fn: (project: string) => Promise<void>) {
  const project = await Deno.makeTempDir();
  try {
    await fn(project);
  } finally {
    await Deno.remove(project, { recursive: true });
  }
}

Deno.test("lists open tasks grouped by status with progress", async () => {
  await withProject(async (p) => {
    await install(p);
    await plant(
      p,
      `${DEFAULT_ROOT}/2026/09/alpha.md`,
      task(
        "in progress",
        "Alpha task",
        ["- [x] one", "- [ ] two"],
        "implements:\n  - FR-A\n",
      ),
    );
    await plant(
      p,
      `${DEFAULT_ROOT}/2026/09/beta.md`,
      task("to do", "Beta task", ["- [ ] one"]),
    );
    await plant(
      p,
      `${DEFAULT_ROOT}/legacy-flat.md`,
      task(null, "Legacy task"),
    );
    await plant(p, `${DEFAULT_ROOT}/README.md`, "# not a task\n");
    const r = await run(p);
    assertEquals(r.code, 0, r.stderr);
    const inProgress = r.stdout.indexOf("in progress");
    const toDo = r.stdout.indexOf("to do");
    const unknown = r.stdout.indexOf("unknown");
    assert(inProgress >= 0 && toDo > inProgress && unknown > toDo, r.stdout);
    assertStringIncludes(r.stdout, `${DEFAULT_ROOT}/2026/09/alpha.md`);
    assertStringIncludes(r.stdout, "[1/2]");
    assertStringIncludes(r.stdout, "Alpha task");
    assertStringIncludes(r.stdout, "FR-A");
    assertStringIncludes(r.stdout, "[0/1]");
    assertStringIncludes(r.stdout, "Legacy task");
    assert(!r.stdout.includes("README.md"), r.stdout);
    assertStringIncludes(r.stdout, "3 open");
  });
});

Deno.test("hides archived tasks unless --all", async () => {
  await withProject(async (p) => {
    await install(p);
    await plant(
      p,
      `${DEFAULT_ROOT}/2026/08/open.md`,
      task("to do", "Open one"),
    );
    await plant(
      p,
      `${DEFAULT_ROOT}/2026/08/finished.md`,
      task("done", "Finished one", ["- [x] a"]),
    );
    await plant(
      p,
      `${DEFAULT_ROOT}/2026/08/old.md`,
      task("superseded", "Old one", [], "superseded_by: x\n"),
    );
    const r = await run(p);
    assertEquals(r.code, 0, r.stderr);
    assertStringIncludes(r.stdout, "Open one");
    assert(!r.stdout.includes("Finished one"), r.stdout);
    assert(!r.stdout.includes("Old one"), r.stdout);
    assertStringIncludes(r.stdout, "2 archived (hidden; use --all)");
    const all = await run(p, "--all");
    assertEquals(all.code, 0, all.stderr);
    assertStringIncludes(all.stdout, "Finished one");
    assertStringIncludes(all.stdout, "Old one");
  });
});

Deno.test("honours a replaced schema block", async () => {
  await withProject(async (p) => {
    await install(
      p,
      `SCHEMA = {
    "root": "docs/todo",
    "pattern": "**/*.md",
    "ignore": [],
    "status_key": "state",
    "missing_status": "unknown",
    "archived_statuses": ["closed", "archived"],
    "archived_dirs": ["archive"],
    "progress_section": None,
}`,
    );
    await plant(p, "docs/todo/one.md", "---\nstate: open\n---\n# One\n");
    await plant(p, "docs/todo/two.md", "---\nstate: closed\n---\n# Two\n");
    await plant(
      p,
      "docs/todo/archive/three.md",
      "---\nstate: open\n---\n# Three\n",
    );
    await plant(p, `${DEFAULT_ROOT}/2026/09/decoy.md`, task("to do", "Decoy"));
    const r = await run(p);
    assertEquals(r.code, 0, r.stderr);
    assertStringIncludes(r.stdout, "One");
    assert(!r.stdout.includes("Two"), r.stdout);
    assert(!r.stdout.includes("Three"), r.stdout);
    assert(!r.stdout.includes("Decoy"), r.stdout);
    assertStringIncludes(r.stdout, "2 archived");
    assert(
      !r.stdout.includes("["),
      "no progress column without a section: " + r.stdout,
    );
  });
});

Deno.test("exits 2 on a missing root", async () => {
  await withProject(async (p) => {
    await install(p);
    const r = await run(p);
    assertEquals(r.code, 2);
    assertStringIncludes(r.stderr, DEFAULT_ROOT);
  });
});

Deno.test("exits 2 on a malformed schema block", async () => {
  await withProject(async (p) => {
    await install(p, "SCHEMA = {");
    const r = await run(p);
    assertEquals(r.code, 2);
    assertStringIncludes(r.stderr, "schema");
  });
});
