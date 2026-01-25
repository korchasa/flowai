export interface BenchmarkChecklistItem {
  id: string;
  description: string;
  critical: boolean;
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  targetAgentPath: string;
  userQuery: string;
  checklist: BenchmarkChecklistItem[];
  setup: (sandboxPath: string) => Promise<void>;
}

export interface BenchmarkResult {
  scenarioId: string;
  success: boolean;
  score: number;
  durationMs: number;
  model: string;
  checklistResults: Record<string, { pass: boolean; reason: string }>;
}
