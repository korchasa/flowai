import { assertEquals } from "@std/assert";
import { isTestPath, stripTestHunks } from "./patch.ts";

Deno.test("isTestPath: tests/ suite dir (plural) is a test path", () => {
  assertEquals(isTestPath("tests/async/test_async_related_managers.py"), true);
  assertEquals(isTestPath("tests/async/models.py"), true); // support module under tests/
  assertEquals(isTestPath("sympy/core/tests/test_assumptions.py"), true);
  assertEquals(isTestPath("tests/unittest_pyreverse_inspector.py"), true); // pylint: no test_ prefix
});

Deno.test("isTestPath: pytest basenames anywhere are test paths", () => {
  assertEquals(isTestPath("pkg/test_foo.py"), true);
  assertEquals(isTestPath("pkg/foo_test.py"), true);
  assertEquals(isTestPath("pkg/conftest.py"), true);
});

Deno.test("isTestPath: production code is NOT a test path", () => {
  // django/test/ (singular) is the production test-framework package, not the suite
  assertEquals(isTestPath("django/test/utils.py"), false);
  assertEquals(isTestPath("django/db/models/base.py"), false);
  assertEquals(isTestPath("sympy/polys/densearith.py"), false);
  assertEquals(isTestPath("pylint/pyreverse/inspector.py"), false);
  assertEquals(isTestPath("django/contrib/contenttypes/fields.py"), false);
});

Deno.test("isTestPath: tolerates a/ b/ diff prefixes", () => {
  assertEquals(isTestPath("b/tests/test_x.py"), true);
  assertEquals(isTestPath("a/django/db/models/base.py"), false);
});

Deno.test("stripTestHunks: drops the colliding test section, keeps production", () => {
  const patch = [
    "diff --git a/django/db/models/base.py b/django/db/models/base.py",
    "index 111..222 100644",
    "--- a/django/db/models/base.py",
    "+++ b/django/db/models/base.py",
    "@@ -1,1 +1,2 @@",
    " prod",
    "+prod-change",
    "diff --git a/tests/async/test_async_related_managers.py b/tests/async/test_async_related_managers.py",
    "new file mode 100644",
    "index 000..333",
    "--- /dev/null",
    "+++ b/tests/async/test_async_related_managers.py",
    "@@ -0,0 +1,1 @@",
    "+def test_x(): pass",
    "",
  ].join("\n");
  const { patch: out, stripped } = stripTestHunks(patch);
  assertEquals(stripped, ["tests/async/test_async_related_managers.py"]);
  // production section survives verbatim, test section gone
  assertEquals(out.includes("django/db/models/base.py"), true);
  assertEquals(out.includes("+prod-change"), true);
  assertEquals(out.includes("test_async_related_managers"), false);
});

Deno.test("stripTestHunks: no test hunks → patch unchanged, empty stripped", () => {
  const patch = [
    "diff --git a/django/db/models/base.py b/django/db/models/base.py",
    "index 111..222 100644",
    "--- a/django/db/models/base.py",
    "+++ b/django/db/models/base.py",
    "@@ -1,1 +1,2 @@",
    " prod",
    "+prod-change",
    "",
  ].join("\n");
  const { patch: out, stripped } = stripTestHunks(patch);
  assertEquals(stripped, []);
  assertEquals(out.trim(), patch.trim());
});

Deno.test("stripTestHunks: empty patch is a no-op", () => {
  const { patch, stripped } = stripTestHunks("");
  assertEquals(patch, "");
  assertEquals(stripped, []);
});

Deno.test("stripTestHunks: all-test patch strips to empty", () => {
  const patch = [
    "diff --git a/tests/test_a.py b/tests/test_a.py",
    "--- a/tests/test_a.py",
    "+++ b/tests/test_a.py",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "",
  ].join("\n");
  const { patch: out, stripped } = stripTestHunks(patch);
  assertEquals(stripped, ["tests/test_a.py"]);
  assertEquals(out.trim(), "");
});
