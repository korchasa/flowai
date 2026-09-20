/**
 * Explicit, paid judge calibration for FR-READABILITY.LANGUAGE and
 * FR-READABILITY.READER-CONTEXT: the fixed replies exercise the language item
 * and the meaning items of the same checklists.
 * This file is deliberately not named *_test.ts: regular checks must not call models.
 * Run from the repository root:
 * deno test -A <this-file> -- <output-directory>
 * Fixed replies exercise the real scenario checklist; they never substitute for Claude runs.
 */
import { assertEquals } from "@std/assert";
import { join, resolve } from "@std/path";
import { evaluateChecklist } from "@acceptance-tests/judge.ts";
import { closeCodexSessions, loadConfig } from "@acceptance-tests/llm.ts";
import { prepareCodexJudgeHome } from "@acceptance-tests/acp/auth.ts";
import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

const outputArg = Deno.args[0];
if (!outputArg) throw new Error("Pass a new output directory after --");
const output = resolve(outputArg);
const caseRoot = resolve(import.meta.dirname!, "..");
const selectedCase = Deno.args[1];
const suffixes = [
  "source",
  "code",
  "interface",
  "jargon",
  "dialogue",
  "exceptions",
];
if (selectedCase && !suffixes.includes(selectedCase)) {
  throw new Error(`Unknown case: ${selectedCase}`);
}

Deno.test({
  name:
    "chat language checklists distinguish fixed replies twice with the real judge",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // A fresh directory makes old results impossible to mistake for this run.
    await Deno.mkdir(output);
    const judgeHome = await Deno.makeTempDir({
      prefix: "chat-judge-calibration-",
    });
    const env = await prepareCodexJudgeHome(judgeHome);
    const config = (await loadConfig()).ides.claude.judge;
    const results: unknown[] = [];
    const mismatches: string[] = [];
    try {
      for (const suffix of selectedCase ? [selectedCase] : suffixes) {
        const folder = join(caseRoot, `agents-rules-chat-${suffix}`);
        const { scenario }: { scenario: BenchmarkScenario } = await import(
          new URL(`file://${folder}/mod.ts`).href
        );
        const samples: Array<{
          id: string;
          agentLogs: string;
          expected: Record<string, boolean>;
        }> = JSON.parse(
          await Deno.readTextFile(join(folder, "calibration.json")),
        );
        for (const sample of samples) {
          for (let repeat = 1; repeat <= 2; repeat++) {
            const label = `${scenario.id}/${sample.id}/${repeat}`;
            const runDir = join(output, scenario.id, sample.id, String(repeat));
            await Deno.mkdir(runDir, { recursive: true });
            const verdict = await evaluateChecklist(
              scenario.userQuery,
              sample.agentLogs,
              "No files were changed.",
              scenario.checklist,
              { ...config, env: { ...env }, cwd: judgeHome },
              runDir,
            );
            const actual = Object.fromEntries(
              Object.entries(verdict.results).map((
                [id, result],
              ) => [id, result.pass]),
            );
            // Assert each sample independently, but preserve the full matrix before failing.
            try {
              assertEquals(actual, sample.expected);
            } catch {
              mismatches.push(label);
            }
            results.push({
              label,
              model: config.model,
              effort: config.effort,
              temperature: config.temperature,
              expected: sample.expected,
              actual: verdict.results,
              input: sample.agentLogs,
              checklist: scenario.checklist,
              usage: verdict.usage,
            });
            await Deno.writeTextFile(
              join(output, "results.json"),
              JSON.stringify({ results, mismatches }, null, 2) + "\n",
            );
            console.log(
              `${label}: ${
                mismatches.includes(label) ? "MISMATCH" : "matched"
              }`,
            );
          }
        }
      }
      assertEquals(
        mismatches,
        [],
        "Judge disagreed with predefined labels; inspect results.json",
      );
    } finally {
      closeCodexSessions();
    }
  },
});
