/**
 * Drives `validate.py` the way the skill tells the agent to drive it, so
 * `deno task check` covers the checker even though the checker is Python.
 *
 * The cases below are the ones that separated a rendering diagram from a
 * broken one when both were fed to the official Mermaid parser (2026-08-30,
 * 43 probe files; 2026-08-31, 12 agent-written diagrams). Checker and parser
 * agreed on all 55.
 */
import { assert, assertEquals } from "jsr:@std/assert";
import { fromFileUrl, join } from "jsr:@std/path";

const SCRIPT = fromFileUrl(new URL("./validate.py", import.meta.url));

interface Verdict {
  ok: boolean;
  result: { valid: boolean; file: string; errors: string[] };
}

/** Run the checker over `body` written to a temp file with `ext`. */
async function check(body: string, ext = ".mmd"): Promise<Verdict> {
  const dir = await Deno.makeTempDir();
  const file = join(dir, `diagram${ext}`);
  await Deno.writeTextFile(file, body);
  try {
    const out = await new Deno.Command("python3", {
      args: [SCRIPT, file],
      stdout: "piped",
      stderr: "piped",
    }).output();
    return JSON.parse(new TextDecoder().decode(out.stdout));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("validate.py: unquoted brackets in a node label are rejected", async () => {
  const v = await check("graph TD\n  A[Build (CI runs check)] --> B[Done]\n");
  assertEquals(v.ok, false);
  assert(v.result.errors[0].includes("unquoted bracket"));
});

Deno.test("validate.py: quoting the same label makes it pass", async () => {
  const v = await check('graph TD\n  A["Build (CI runs check)"] --> B[Done]\n');
  assertEquals(v.ok, true);
  assertEquals(v.result.errors, []);
});

Deno.test("validate.py: unquoted brackets in an edge label are rejected", async () => {
  const v = await check("graph TD\n  A -->|retry (3x)| B\n");
  assertEquals(v.ok, false);
});

Deno.test("validate.py: unquoted brackets in a subgraph title are rejected", async () => {
  const v = await check(
    "graph TD\n  subgraph Build (CI)\n    A --> B\n  end\n",
  );
  assertEquals(v.ok, false);
});

Deno.test("validate.py: a reserved word as a node id is rejected, quoted or not", async () => {
  assertEquals((await check("graph TD\n  start --> end\n")).ok, false);
  assertEquals((await check('graph TD\n  start --> "end"\n')).ok, false);
});

Deno.test("validate.py: the same word is fine as label text", async () => {
  const v = await check('graph TD\n  A["end"] --> B\n');
  assertEquals(v.ok, true);
});

Deno.test("validate.py: a semicolon in a sequence message is rejected", async () => {
  const v = await check(
    "sequenceDiagram\n  A->>B: drain connections; wait for idle\n",
  );
  assertEquals(v.ok, false);
});

Deno.test("validate.py: the #semi; escape is accepted", async () => {
  const v = await check(
    "sequenceDiagram\n  A->>B: drain connections#semi; wait for idle\n",
  );
  assertEquals(v.ok, true);
});

Deno.test("validate.py: harmless characters are not flagged", async () => {
  const body = "graph TD\n" +
    "  A[Notify #eng-alerts] --> B[Roll back & page on-call]\n" +
    "  B --> C[Coverage < 80%]\n" +
    "  C --> D[Tag v<major>.<minor>]\n" +
    "  D --> E[Deploy 🚀 to prod]\n" +
    "  E --> F[Сборка проекта]\n";
  const v = await check(body);
  assertEquals(v.result.errors, []);
});

Deno.test("validate.py: reads every mermaid fence in a markdown file", async () => {
  const body = "# Doc\n\n```mermaid\ngraph TD\n  A[ok] --> B[ok]\n```\n\n" +
    "## Second\n\n```mermaid\nsequenceDiagram\n  A->>B: drain; wait\n```\n";
  const v = await check(body, ".md");
  assertEquals(v.ok, false);
  assertEquals(v.result.errors.length, 1);
  // The offending message is the 12th line of the file, inside the second fence.
  assert(v.result.errors[0].includes("line 12"), v.result.errors[0]);
});

Deno.test("validate.py: a missing file is reported, not thrown", async () => {
  const out = await new Deno.Command("python3", {
    args: [SCRIPT, "/tmp/no-such-mermaid-file.mmd"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const v: Verdict = JSON.parse(new TextDecoder().decode(out.stdout));
  assertEquals(v.ok, false);
  assertEquals(v.result.errors, [
    "File not found: /tmp/no-such-mermaid-file.mmd",
  ]);
});
