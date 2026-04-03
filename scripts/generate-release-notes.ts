/**
 * Generates release notes from conventional commits between two git tags.
 *
 * Usage: deno run -A scripts/generate-release-notes.ts <from-tag> <to-tag>
 * Output: Markdown release notes to stdout.
 */

const CATEGORIES: [RegExp, string][] = [
  [/^feat/, "Features"],
  [/^fix/, "Bug Fixes"],
  [/^refactor/, "Refactoring"],
  [/^perf/, "Performance"],
  [/^docs/, "Documentation"],
  [/^build/, "Build"],
];

function parseCommit(
  subject: string,
): { scope: string; description: string } | null {
  const match = subject.match(/^[a-z]+(?:\(([^)]+)\))?: (.+)$/);
  if (!match) return null;
  return { scope: match[1] ?? "", description: match[2] };
}

async function resolveRef(ref: string): Promise<string> {
  const { success } = await new Deno.Command("git", {
    args: ["rev-parse", "--verify", ref],
    stdout: "null",
    stderr: "null",
  }).output();
  return success ? ref : "HEAD";
}

async function getCommitSubjects(
  fromTag: string,
  toTag: string,
): Promise<string[]> {
  const resolvedTo = await resolveRef(toTag);
  const { success, code, stdout } = await new Deno.Command("git", {
    args: ["log", "--pretty=format:%s", `${fromTag}..${resolvedTo}`],
  }).output();

  if (!success) {
    throw new Error(`git log failed (exit ${code})`);
  }
  const text = new TextDecoder().decode(stdout);
  return text.trim().split("\n").filter((l) => l.length > 0);
}

function generateNotes(
  subjects: string[],
  fromTag: string,
  toTag: string,
  repo: string,
): string {
  const lines: string[] = ["## What's Changed", ""];

  for (const [prefix, label] of CATEGORIES) {
    const matching = subjects.filter(
      (s) => prefix.test(s) && !s.startsWith("chore(release)"),
    );
    if (matching.length === 0) continue;

    lines.push(`### ${label}`, "");
    for (const subject of matching) {
      const parsed = parseCommit(subject);
      if (parsed) {
        const entry = parsed.scope
          ? `- **${parsed.scope}**: ${parsed.description}`
          : `- ${parsed.description}`;
        lines.push(entry);
      } else {
        lines.push(`- ${subject}`);
      }
    }
    lines.push("");
  }

  lines.push(
    "",
    `**Full Changelog**: https://github.com/${repo}/compare/${fromTag}...${toTag}`,
  );
  return lines.join("\n");
}

if (import.meta.main) {
  const [fromTag, toTag, repo] = Deno.args;
  if (!fromTag || !toTag) {
    console.error(
      "Usage: generate-release-notes.ts <from-tag> <to-tag> [owner/repo]",
    );
    Deno.exit(1);
  }

  const subjects = await getCommitSubjects(fromTag, toTag);
  const notes = generateNotes(
    subjects,
    fromTag,
    toTag,
    repo ?? "korchasa/flowai",
  );
  console.log(notes);
}

export { generateNotes, parseCommit };
