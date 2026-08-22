import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { composeSandboxAgentsMd } from "./runner.ts";

// maintenance-instruction-coherence, sweeps 2026-08-16T13-03-00 and
// 2026-08-20T23-49-00 — red both times on the same three checklist items.
// The scenario's fixture ships a `CLAUDE.md` carrying four planted
// contradictions (tabs vs 2 spaces, camelCase vs snake_case, never-mock vs
// mock-freely, JSDoc required vs optional). `prepareSandboxFiles` copied it in
// at step 1.5 and then overwrote it at step 1.8 with the rendered template, so
// the sandbox held two byte-identical 23300-byte files and
// `grep -c "tabs for indentation\|snake_case\|Mock freely"` returned 0. The
// agent was scored for failing to find contradictions that had been deleted
// before it started. Six other fixtures ship a root instruction file and were
// losing it the same way: five memex scenarios whose AGENTS.md IS the schema
// they audit against, and commit/doc-sync-gate whose AGENTS.md carries the
// documentation rules the gate enforces.

Deno.test("composeSandboxAgentsMd — keeps the fixture's own instructions", () => {
  const rendered = "# Core Project Rules\n\n- Always run `NO_COLOR=1`.\n";
  const fixture =
    "# Project Instructions\n\n- Always use tabs for indentation.\n" +
    "- Use spaces for indentation (2 spaces per level).\n";

  const out = composeSandboxAgentsMd(rendered, fixture);

  assertStringIncludes(
    out,
    "tabs for indentation",
    "the fixture's planted contradiction did not survive into the sandbox file",
  );
  assertStringIncludes(
    out,
    "spaces for indentation",
    "the fixture's second half did not survive into the sandbox file",
  );
  assertStringIncludes(
    out,
    "NO_COLOR=1",
    "the rendered template must still reach the agent — it carries the project rules the scenarios measure",
  );
});

Deno.test("composeSandboxAgentsMd — template first, fixture after it", () => {
  const out = composeSandboxAgentsMd("TEMPLATE_BODY\n", "FIXTURE_BODY\n");
  assert(
    out.indexOf("TEMPLATE_BODY") < out.indexOf("FIXTURE_BODY"),
    "the rendered template must come first so its headings keep their structure",
  );
});

Deno.test("composeSandboxAgentsMd — no fixture file leaves the template untouched", () => {
  const rendered = "# Core Project Rules\n";
  assertEquals(composeSandboxAgentsMd(rendered, null), rendered);
  assertEquals(composeSandboxAgentsMd(rendered, ""), rendered);
  assertEquals(composeSandboxAgentsMd(rendered, "   \n\n"), rendered);
});

Deno.test("composeSandboxAgentsMd — does not duplicate content already present", () => {
  // The fixture file is read back from the sandbox, so a second pass over an
  // already-composed file must not append the same block twice.
  const rendered = "# Core Project Rules\n";
  const once = composeSandboxAgentsMd(rendered, "FIXTURE_BODY\n");
  const twice = composeSandboxAgentsMd(once, "FIXTURE_BODY\n");
  assertEquals(twice, once);
});
