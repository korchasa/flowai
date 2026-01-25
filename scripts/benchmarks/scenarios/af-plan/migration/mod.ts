import { BenchmarkScenario } from "../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-plan/SKILL.md";

export const PlanMigrationBench: BenchmarkScenario = {
  id: "af-plan-migration",
  name: "Plan Async Migration",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "src"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });

    const legacyCode = `
const fs = require('fs');
const request = require('request');

function getData(url, callback) {
  request(url, (err, res, body) => {
    if (err) return callback(err);
    
    fs.writeFile('cache.json', body, (err) => {
      if (err) return callback(err);
      callback(null, body);
    });
  });
}

module.exports = { getData };
`;
    await Deno.writeTextFile(
      join(sandboxPath, "src/data-loader.js"),
      legacyCode,
    );
  },

  userQuery:
    "Plan a migration of src/data-loader.js to use modern Node.js APIs (fs/promises) and 'fetch' instead of 'request'. Also switch to async/await.",

  checklist: [
    {
      id: "identify_deprecated",
      description:
        "Does the plan identify the usage of the deprecated 'request' library and callback-based 'fs'?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_fetch",
      description:
        "Does the plan propose replacing 'request' with the native 'fetch' API (or axios/got)?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_async_await",
      description:
        "Does the plan explicitly state converting the callback structure to async/await?",
      critical: true,
      type: "semantic",
    },
    {
      id: "error_handling",
      description:
        "Does the plan mention updating error handling (e.g., using try/catch)?",
      critical: true,
      type: "semantic",
    },
  ],
};
