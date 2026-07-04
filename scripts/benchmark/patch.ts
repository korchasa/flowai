/**
 * Test-file stripping for SWE-bench predictions (FR-BENCH-SWE).
 *
 * SWE-bench grades a `model_patch` against the dataset's hidden gold `test_patch`,
 * which the harness applies AFTER the model patch. If the model patch creates or
 * edits a file the gold `test_patch` also touches, `git apply` collides and the
 * ENTIRE gold test_patch is rejected atomically — every FAIL_TO_PASS then errors,
 * even when the production fix is correct. Observed on django-16256: production
 * complete, self-authored `tests/async/test_async_related_managers.py` collided
 * with the gold path → 0/9 graded; stripping it → 9/9 resolved (verified via the
 * `exp-16256-notest` re-grade).
 *
 * The agent's own tests are never the oracle. Stripping every test-file hunk from
 * the prediction before grading removes the collision without changing the graded
 * production behaviour. Pure string transform over a unified diff.
 */

/**
 * A path is a test file iff it lives under a `tests/` suite directory (plural)
 * OR carries a pytest test basename. The `tests/` segment (not `/test/`) is
 * deliberate: Django's `django/test/` is the production test-framework package,
 * not the suite — matching `/test/` would strip real production code. The
 * directory rule is required because some repos name oracle files without a
 * `test_` prefix (pylint: `tests/unittest_pyreverse_*.py`).
 */
export function isTestPath(path: string): boolean {
  const p = path.replace(/^[ab]\//, "");
  if (/(^|\/)tests\//.test(p)) return true;
  const base = p.split("/").pop() ?? "";
  return /^test_.*\.py$/.test(base) || /_test\.py$/.test(base) ||
    base === "conftest.py";
}

/** One `diff --git` section of a unified diff: its header line + all its lines. */
interface Section {
  /** The `diff --git a/… b/…` header, or "" for any preamble before the first. */
  header: string;
  lines: string[];
}

/** Split a unified diff into per-file sections, each starting at `diff --git `. */
function splitSections(patch: string): Section[] {
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      if (cur) sections.push(cur);
      cur = { header: line, lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      cur = { header: "", lines: [line] };
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

/** Parse the target (`b/…`) path from a `diff --git` header, or "" if unparsable. */
function targetPath(header: string): string {
  const m = header.match(/^diff --git a\/.+? b\/(.+)$/);
  return m ? m[1] : "";
}

/**
 * Drop every test-file section from a unified diff, keeping production hunks
 * verbatim. Returns the stripped patch and the list of dropped target paths.
 * An empty or whitespace-only patch is a no-op.
 */
export function stripTestHunks(
  patch: string,
): { patch: string; stripped: string[] } {
  if (patch.trim() === "") return { patch, stripped: [] };
  const kept: string[] = [];
  const stripped: string[] = [];
  for (const s of splitSections(patch)) {
    const path = targetPath(s.header);
    if (path !== "" && isTestPath(path)) {
      stripped.push(path);
      continue;
    }
    kept.push(s.lines.join("\n"));
  }
  let out = kept.join("\n").replace(/\n+$/, "");
  if (out !== "") out += "\n";
  return { patch: out, stripped };
}
