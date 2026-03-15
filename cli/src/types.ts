/** IDE definition */
export interface IDE {
  name: string;
  configDir: string;
}

/** .flow.yaml config structure */
export interface FlowConfig {
  version: string;
  ides: string[];
  skills: {
    include: string[];
    exclude: string[];
  };
  agents: {
    include: string[];
    exclude: string[];
  };
}

/** Downloaded file in memory */
export interface UpstreamFile {
  path: string;
  content: string;
}

/** Plan item action */
export type PlanAction = "create" | "update" | "ok" | "conflict";

/** Plan item type */
export type PlanItemType = "skill" | "agent";

/** Plan item for sync */
export interface PlanItem {
  type: PlanItemType;
  name: string;
  action: PlanAction;
  sourcePath: string;
  targetPath: string;
  content: string;
}

/** Known IDE definitions */
export const KNOWN_IDES: Record<string, IDE> = {
  cursor: { name: "cursor", configDir: ".cursor" },
  claude: { name: "claude", configDir: ".claude" },
  opencode: { name: "opencode", configDir: ".opencode" },
};

/** Default config values */
export const DEFAULT_VERSION = "1.0";
