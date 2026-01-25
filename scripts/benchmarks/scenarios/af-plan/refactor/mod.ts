import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-plan/SKILL.md";

export const PlanRefactorBench: BenchmarkScenario = {
  id: "af-plan-refactor",
  name: "Plan Refactoring of God Class",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "src"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });

    const godClassContent = `
import * as fs from 'fs';
import * as path from 'path';

export class UserManager {
  private dbPath = 'users.json';

  constructor() {
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, '[]');
    }
  }

  async createUser(name: string, email: string) {
    // Validation
    if (!email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (name.length < 2) {
      throw new Error('Name too short');
    }

    // DB Access
    const users = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
    const newUser = { id: Date.now(), name, email };
    users.push(newUser);
    fs.writeFileSync(this.dbPath, JSON.stringify(users));

    // Email Sending
    console.log(\`Sending welcome email to \${email}...\`);
    // Simulate email delay
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Email sent');

    // Logging
    const logEntry = \`[\${new Date().toISOString()}] User created: \${email}\\n\`;
    fs.appendFileSync('app.log', logEntry);

    return newUser;
  }

  async deleteUser(id: number) {
    // DB Access
    const users = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
    const filtered = users.filter((u: any) => u.id !== id);
    fs.writeFileSync(this.dbPath, JSON.stringify(filtered));

    // Logging
    const logEntry = \`[\${new Date().toISOString()}] User deleted: \${id}\\n\`;
    fs.appendFileSync('app.log', logEntry);
  }
}
`;
    await Deno.writeTextFile(
      join(sandboxPath, "src/UserManager.ts"),
      godClassContent,
    );
  },

  userQuery:
    "Plan a refactoring of src/UserManager.ts to separate concerns. It does too much right now.",

  checklist: [
    {
      id: "identify_responsibilities",
      description:
        "Does the plan identify separate responsibilities like Database/Storage, Validation, Email/Notification, and Logging?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_services",
      description:
        "Does the plan propose creating separate classes or services (e.g., UserRepository, EmailService, Logger)?",
      critical: true,
      type: "semantic",
    },
    {
      id: "dependency_injection",
      description:
        "Does the plan mention using dependency injection or passing dependencies to the UserManager?",
      critical: false,
      type: "semantic",
    },
    {
      id: "test_preservation",
      description:
        "Does the plan mention ensuring functionality is preserved or adding tests before refactoring?",
      critical: true,
      type: "semantic",
    },
  ],
};
