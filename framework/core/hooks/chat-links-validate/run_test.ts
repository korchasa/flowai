// Unit tests for the chat-links-validate Stop hook.
// [REF:fr:chat-links.hook | FR-CHAT-LINKS.HOOK]
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import {
  analyzeAnswer,
  decide,
  extractCandidates,
  type Finding,
  listTreeFiles,
} from "./run.ts";

const RUN_TS = join(dirname(fromFileUrl(import.meta.url)), "run.ts");

function pathsOf(text: string): string[] {
  return extractCandidates(text).map((c) => `${c.form}:${c.path}`);
}

/** A project tree with a few nested files, outside any git work tree. */
async function makeTree(): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "chat-links-" });
  for (
    const rel of [
      "docs/a.md",
      "src/area/b.ts",
      "packages/web/src/config/app.ts",
      "packages/api/src/config/app.ts",
      "node_modules/pkg/index.js",
    ]
  ) {
    await Deno.mkdir(join(root, dirname(rel)), { recursive: true });
    await Deno.writeTextFile(join(root, rel), "x\n");
  }
  return root;
}

async function git(cwd: string, ...args: string[]): Promise<void> {
  const out = await new Deno.Command("git", {
    args,
    cwd,
    stdout: "null",
    stderr: "null",
  }).output();
  assert(out.success, `git ${args.join(" ")} failed`);
}

async function withTree(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await makeTree();
  try {
    await fn(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

function kinds(findings: Finding[]): string[] {
  return findings.map((f) => `${f.kind}:${f.path}`);
}

// ---------------------------------------------------------------------------
// Extraction — which tokens count as a claim about a file.
// ---------------------------------------------------------------------------

Deno.test("extract-counts-only-marked-paths", () => {
  const cases: Array<[string, string, string[]]> = [
    ["markdown link", "see [x](docs/a.md)", ["link:docs/a.md"]],
    ["inline code", "see `docs/a.md`", ["code:docs/a.md"]],
    ["bare prose is not a claim", "see docs/a.md", []],
    ["a slash in prose", "Slack/Jira/GitLab and reads/writes", []],
    ["a directory needs a trailing slash", "`src/area/`", ["code:src/area/"]],
    ["a token with no extension is not a file", "`src/area`", []],
    ["a url is not a local path", "[x](https://example.com/a.md)", []],
    ["a git remote is not a local path", "`git@host:group/repo.git`", []],
    ["an argument is not a path", "`--config=conf/a.yml`", []],
    ["a template is not a path", "`docs/<name>.md`", []],
    ["an ellipsis is a template", "`docs/.../a.md`", []],
    ["an image reference", "`registry/app:1.2.3`", []],
    ["a line suffix is stripped", "[a](docs/a.md:12)", ["link:docs/a.md"]],
    ["a line range is stripped", "`docs/a.md:12-30`", ["code:docs/a.md"]],
    ["an anchor is stripped", "[a](docs/a.md#head)", ["link:docs/a.md"]],
    ["a pure anchor is not a path", "[a](#head)", []],
  ];
  for (const [name, text, want] of cases) {
    assertEquals(pathsOf(text), want, name);
  }
});

Deno.test("extract-quoted-regions-count-for-nothing", () => {
  const cases: Array<[string, string]> = [
    ["three-backtick fence", "```\n`docs/a.md`\n```"],
    ["four-backtick fence", "````\n[a](docs/a.md)\n````"],
    ["tilde fence", "~~~\n`docs/a.md`\n~~~"],
    ["fence with an info string", "```bash\n`docs/a.md`\n```"],
    ["unclosed fence", "```\n`docs/a.md`"],
    ["blockquote", "> `docs/a.md`"],
    ["nested blockquote", ">> `docs/a.md`"],
    ["fence inside a quote", "> ```\n> `docs/a.md`\n> ```"],
    ["inner run inside a longer fence", "````\n```\n`docs/a.md`\n```\n````"],
    ["paired inline run", "text ```docs/a.md``` more"],
    [
      "a shorter run does not close a longer fence",
      "````\n```\n[a](docs/a.md)\n````",
    ],
    [
      "the other fence character does not close it",
      "```\n~~~\n[a](docs/a.md)\n```",
    ],
  ];
  for (const [name, text] of cases) {
    assertEquals(pathsOf(text), [], name);
  }
});

Deno.test("extract-text-after-a-closed-fence-is-still-read", () => {
  assertEquals(pathsOf("```\nquoted/x.md\n```\n\nsee [a](docs/a.md)"), [
    "link:docs/a.md",
  ]);
  assertEquals(pathsOf("````\n[a](docs/a.md)\n````\n[b](docs/b.md)"), [
    "link:docs/b.md",
  ]);
});

Deno.test("extract-inline-span-at-line-start-is-not-a-fence", () => {
  assertEquals(pathsOf("```x``` and then [a](docs/a.md)"), ["link:docs/a.md"]);
});

Deno.test("extract-link-text-is-not-counted-twice", () => {
  assertEquals(pathsOf("see [`docs/a.md`](docs/a.md)"), ["link:docs/a.md"]);
});

// ---------------------------------------------------------------------------
// Analysis — the three finding kinds against a real tree.
// ---------------------------------------------------------------------------

Deno.test("broken-link-to-missing-file-is-reported", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer("see [x](docs/missing.md)", root);
    assertEquals(kinds(findings), ["broken-link:docs/missing.md"]);
  });
});

Deno.test("broken-link-lists-matches-found-deeper-in-the-tree", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer("see [b](area/b.ts:3)", root);
    assertEquals(kinds(findings), ["broken-link:area/b.ts"]);
    assertEquals(findings[0].matches, ["src/area/b.ts"]);
  });
});

Deno.test("broken-link-absolute-outside-project-is-checked", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer(
      "see [x](/definitely/not/here/file.md)",
      root,
    );
    assertEquals(kinds(findings), ["broken-link:/definitely/not/here/file.md"]);
  });
});

Deno.test("broken-link-absolute-inside-project-resolves", async () => {
  await withTree(async (root) => {
    const ok = await analyzeAnswer(`see [a](${root}/docs/a.md)`, root);
    assertEquals(ok, []);
    const bad = await analyzeAnswer(`see [a](${root}/docs/nope.md)`, root);
    assertEquals(kinds(bad), ["broken-link:docs/nope.md"]);
  });
});

Deno.test("missing-link-existing-path-in-backticks-is-reported", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer("edit `docs/a.md:4` now", root);
    assertEquals(kinds(findings), ["missing-link:docs/a.md"]);
  });
});

Deno.test("missing-link-existing-directory-in-backticks-is-reported", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer("look in `src/area/`", root);
    assertEquals(kinds(findings), ["missing-link:src/area/"]);
  });
});

Deno.test("baseless-path-lists-full-paths", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer("the file `src/config/app.ts`", root);
    assertEquals(kinds(findings), ["baseless:src/config/app.ts"]);
    assertEquals(findings[0].matches, [
      "packages/api/src/config/app.ts",
      "packages/web/src/config/app.ts",
    ]);
  });
});

Deno.test("backtick-path-with-no-file-anywhere-is-left-alone", async () => {
  await withTree(async (root) => {
    // A file still to be created, or a path on a server: backticks are right.
    assertEquals(await analyzeAnswer("I will create `docs/new.md`", root), []);
    assertEquals(
      await analyzeAnswer("on the host `/etc/nginx/nginx.conf`", root),
      [],
    );
  });
});

Deno.test("correct-links-produce-no-finding", async () => {
  await withTree(async (root) => {
    const text =
      "See [a.md:3](docs/a.md) and [b](src/area/b.ts:10) and [dir](src/area/).";
    assertEquals(await analyzeAnswer(text, root), []);
  });
});

Deno.test("same-path-is-reported-once", async () => {
  await withTree(async (root) => {
    const findings = await analyzeAnswer(
      "[x](docs/nope.md) and again `docs/nope.md` and [y](docs/nope.md)",
      root,
    );
    assertEquals(findings.length, 1);
  });
});

Deno.test("tree-index-skips-node-modules-outside-git", async () => {
  await withTree(async (root) => {
    const files = await listTreeFiles(root);
    assert(files.includes("docs/a.md"));
    assert(!files.some((f) => f.startsWith("node_modules/")));
  });
});

Deno.test("tree-index-honours-gitignore-inside-git", async () => {
  await withTree(async (root) => {
    await git(root, "init", "-q");
    await Deno.writeTextFile(join(root, ".gitignore"), "packages/api/\n");
    const files = await listTreeFiles(root);
    assert(files.includes("packages/web/src/config/app.ts"));
    assert(!files.includes("packages/api/src/config/app.ts"));
  });
});

// ---------------------------------------------------------------------------
// Decision and the hook entry point.
// ---------------------------------------------------------------------------

const ONE_FINDING: Finding[] = [{
  kind: "broken-link",
  form: "link",
  raw: "[x](docs/missing.md)",
  path: "docs/missing.md",
  matches: [],
}];

Deno.test("decide-blocks-with-a-short-correction-request", () => {
  const decision = decide({}, ONE_FINDING);
  assert(decision.block);
  assertStringIncludes(decision.reason!, "docs/missing.md");
  assertStringIncludes(decision.reason!, "Do NOT repeat the answer");
  assertStringIncludes(decision.reason!, "Link rules:");
});

Deno.test("decide-describes-every-finding-kind", () => {
  const reason = decide({}, [
    ...ONE_FINDING,
    {
      kind: "missing-link",
      form: "code",
      raw: "docs/a.md",
      path: "docs/a.md",
      matches: [],
    },
    {
      kind: "baseless",
      form: "code",
      raw: "config/app.ts",
      path: "config/app.ts",
      matches: ["src/config/app.ts"],
    },
  ]).reason!;
  assertStringIncludes(reason, "3 file-path problems");
  assertStringIncludes(reason, "Broken link");
  assertStringIncludes(reason, "[docs/a.md](docs/a.md)");
  assertStringIncludes(reason, "src/config/app.ts");
});

Deno.test("decide-stop-hook-active-lets-the-turn-end", () => {
  assertEquals(decide({ stop_hook_active: true }, ONE_FINDING), {
    block: false,
  });
});

Deno.test("decide-no-findings-lets-the-turn-end", () => {
  assertEquals(decide({}, []), { block: false });
});

async function runHook(payload: unknown): Promise<string> {
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", RUN_TS],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(JSON.stringify(payload)));
  await writer.close();
  const out = await child.output();
  assertEquals(out.code, 0);
  return new TextDecoder().decode(out.stdout).trim();
}

Deno.test("main-blocks-on-a-broken-link", async () => {
  await withTree(async (root) => {
    const stdout = await runHook({
      cwd: root,
      last_assistant_message: "Done, see [x](docs/missing.md).",
    });
    const parsed = JSON.parse(stdout);
    assertEquals(parsed.decision, "block");
    assertStringIncludes(parsed.reason, "docs/missing.md");
  });
});

Deno.test("main-is-silent-on-a-clean-answer-and-on-stop-hook-active", async () => {
  await withTree(async (root) => {
    assertEquals(
      await runHook({
        cwd: root,
        last_assistant_message: "See [a](docs/a.md).",
      }),
      "",
    );
    assertEquals(
      await runHook({
        cwd: root,
        stop_hook_active: true,
        last_assistant_message: "See [x](docs/missing.md).",
      }),
      "",
    );
  });
});

Deno.test("main-fails-open-on-bad-input", async () => {
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", RUN_TS],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode("not json"));
  await writer.close();
  const out = await child.output();
  assertEquals(out.code, 0);
  assertEquals(new TextDecoder().decode(out.stdout).trim(), "");
});
