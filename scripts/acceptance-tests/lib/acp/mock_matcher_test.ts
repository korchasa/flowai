import { assert, assertEquals } from "@std/assert";
import { isMockedToolInvoked, resolveMock } from "./mock_matcher.ts";

Deno.test("matches a plain command head", () => {
  assert(isMockedToolInvoked("curl https://example.com", "curl"));
});

Deno.test("matches a head after an env-assignment prefix", () => {
  assert(isMockedToolInvoked('FOO=1 BAR="x" curl https://x', "curl"));
});

Deno.test("matches a head in a later pipe segment", () => {
  assert(isMockedToolInvoked("echo hi | curl -d @- https://x", "curl"));
});

Deno.test("matches an absolute-path head", () => {
  assert(
    isMockedToolInvoked("/opt/homebrew/opt/curl/bin/curl https://x", "curl"),
  );
});

Deno.test("matches a discovery builtin that would leak the path", () => {
  assert(isMockedToolInvoked("command -v curl", "curl"));
  assert(isMockedToolInvoked("which curl", "curl"));
});

Deno.test("matches a head on a later newline-separated statement", () => {
  assert(
    isMockedToolInvoked("DIR=/tmp\ncurl https://x | deno run -A x.ts", "curl"),
  );
});

Deno.test("does NOT match a bare argument that is not a head", () => {
  assertEquals(isMockedToolInvoked("echo curl", "curl"), false);
  assertEquals(isMockedToolInvoked("grep curl file.txt", "curl"), false);
});

Deno.test("does NOT match a substring of another command", () => {
  assertEquals(isMockedToolInvoked("curlimages something", "curl"), false);
});

Deno.test("resolveMock returns the first matched tool and its reason", () => {
  const mocks = { curl: "no network", wget: "no network either" };
  const hit = resolveMock("wget https://x", mocks);
  assertEquals(hit, { tool: "wget", reason: "no network either" });
});

Deno.test("resolveMock returns null when nothing matches", () => {
  assertEquals(resolveMock("echo hello", { curl: "x" }), null);
});
