import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const WritePrdBasicBench = new class extends BenchmarkSkillScenario {
  id = "flow-skill-write-prd-basic";
  name = "Write PRD for User Notification Feature";
  skill = "flow-skill-write-prd";
  stepTimeoutMs = 180_000;

  userQuery =
    "/flow-skill-write-prd Write a PRD for adding push notification support to our mobile app. Users currently have no way to receive alerts about order status changes. We have 50K DAU and process about 10K orders daily. Target: reduce support tickets about order status by 40%.";

  interactive = true;
  userPersona =
    "You are a product manager at an e-commerce company. When asked about target audience, say 'all mobile app users, both iOS and Android'. When asked about constraints, say 'must support both FCM and APNs, budget for 1M notifications/month'. When asked about timeline, say '6 weeks'. Keep answers brief.";
  maxSteps = 20;

  checklist = [
    {
      id: "prd_file_created",
      description:
        "Did the agent create a PRD document file (a markdown file)?",
      critical: true,
    },
    {
      id: "has_executive_summary",
      description:
        "Does the PRD contain an Executive Summary with problem statement, proposed solution, and value proposition?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_success_metrics",
      description:
        "Does the PRD define measurable success metrics (KPIs) with specific numbers (e.g., 'reduce support tickets by 40%')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_user_stories",
      description:
        "Does the PRD contain user stories with acceptance criteria in the format 'As a [User], I want to [Action] so that [Benefit]'?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_out_of_scope",
      description: "Does the PRD explicitly define what is out of scope?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_functional_requirements",
      description:
        "Does the PRD include functional requirements with business rules and edge cases?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_non_functional_requirements",
      description:
        "Does the PRD include non-functional requirements (performance, security, compatibility)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "has_risks_and_dependencies",
      description:
        "Does the PRD list dependencies and risks with mitigation strategies?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "specific_not_vague",
      description:
        "Are requirements specific and measurable rather than vague (e.g., 'latency < 200ms' instead of 'should be fast')?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
