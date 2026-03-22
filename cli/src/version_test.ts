import { assertEquals } from "@std/assert";
import {
  buildUpdateCommand,
  checkForUpdate,
  runUpdate,
  VERSION,
} from "./version.ts";

/** Mock fetch that returns a successful JSR meta response */
function mockFetch(latestVersion: string): typeof globalThis.fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify({ latest: latestVersion }), { status: 200 }),
    );
}

/** Mock fetch that throws a network error */
function mockFetchError(): typeof globalThis.fetch {
  return () => Promise.reject(new Error("Network error"));
}

/** Mock fetch that returns malformed JSON */
function mockFetchMalformed(): typeof globalThis.fetch {
  return () => Promise.resolve(new Response("not json", { status: 200 }));
}

/** Mock fetch that returns non-200 status */
function mockFetchBadStatus(): typeof globalThis.fetch {
  return () => Promise.resolve(new Response("Not Found", { status: 404 }));
}

/** Mock fetch that hangs until aborted (for timeout testing) */
function mockFetchHanging(): typeof globalThis.fetch {
  return (_input: string | URL | Request, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
}

Deno.test("VERSION is a valid semver string", () => {
  assertEquals(typeof VERSION, "string");
  assertEquals(/^\d+\.\d+\.\d+/.test(VERSION), true);
});

Deno.test("checkForUpdate - update available when latest > current", async () => {
  const result = await checkForUpdate("0.1.5", { fetch: mockFetch("0.2.0") });

  assertEquals(result !== null, true);
  assertEquals(result!.currentVersion, "0.1.5");
  assertEquals(result!.latestVersion, "0.2.0");
  assertEquals(result!.updateAvailable, true);
  assertEquals(
    result!.updateCommand,
    "deno install -g -A -f jsr:@korchasa/flowai@0.2.0",
  );
});

Deno.test("checkForUpdate - no update when versions equal", async () => {
  const result = await checkForUpdate("0.2.0", { fetch: mockFetch("0.2.0") });

  assertEquals(result !== null, true);
  assertEquals(result!.updateAvailable, false);
});

Deno.test("checkForUpdate - no update when current > latest", async () => {
  const result = await checkForUpdate("0.3.0", { fetch: mockFetch("0.2.0") });

  assertEquals(result !== null, true);
  assertEquals(result!.updateAvailable, false);
});

Deno.test("checkForUpdate - returns null on network error", async () => {
  const result = await checkForUpdate("0.1.5", { fetch: mockFetchError() });
  assertEquals(result, null);
});

Deno.test("checkForUpdate - returns null on malformed JSON", async () => {
  const result = await checkForUpdate("0.1.5", { fetch: mockFetchMalformed() });
  assertEquals(result, null);
});

Deno.test("checkForUpdate - returns null on non-200 status", async () => {
  const result = await checkForUpdate("0.1.5", {
    fetch: mockFetchBadStatus(),
  });
  assertEquals(result, null);
});

Deno.test("checkForUpdate - returns null on timeout", async () => {
  const result = await checkForUpdate("0.1.5", {
    fetch: mockFetchHanging(),
    timeoutMs: 100,
  });
  assertEquals(result, null);
});

Deno.test("buildUpdateCommand - includes explicit version", () => {
  assertEquals(
    buildUpdateCommand("1.2.3"),
    "deno install -g -A -f jsr:@korchasa/flowai@1.2.3",
  );
});

Deno.test("runUpdate - returns true on success", async () => {
  const result = await runUpdate("0.3.2", {
    spawn: () => Promise.resolve({ success: true, stderr: "" }),
  });
  assertEquals(result, true);
});

Deno.test("runUpdate - returns false on failure", async () => {
  const result = await runUpdate("0.3.2", {
    spawn: () =>
      Promise.resolve({ success: false, stderr: "permission denied" }),
  });
  assertEquals(result, false);
});

Deno.test("runUpdate - passes explicit version in specifier", async () => {
  let receivedCmd: string[] = [];
  await runUpdate("0.4.0", {
    spawn: (cmd) => {
      receivedCmd = cmd;
      return Promise.resolve({ success: true, stderr: "" });
    },
  });
  assertEquals(receivedCmd.includes("jsr:@korchasa/flowai@0.4.0"), true);
});
