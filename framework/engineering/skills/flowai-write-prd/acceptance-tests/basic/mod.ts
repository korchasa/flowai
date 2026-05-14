import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WritePrdBasicBench = new class extends AcceptanceTestScenario {
  id = "flowai-write-prd-basic";
  name = "Write PRD for User Notification Feature";
  skill = "flowai-write-prd";
  agentsTemplateVars = {
    PROJECT_NAME: "ShopNotify",
  };
  stepTimeoutMs = 420_000;

  userQuery =
    "/flowai-write-prd Write a PRD for adding push notification support to our mobile app. Users currently have no way to receive alerts about order status changes. We have 50K DAU and process about 10K orders daily. Target: reduce support tickets about order status by 40%.";

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
    },
    {
      id: "has_success_metrics",
      description:
        "Does the PRD define measurable success metrics (KPIs) with specific numbers (e.g., 'reduce support tickets by 40%')?",
      critical: true,
    },
    {
      id: "has_user_stories",
      description:
        "Does the PRD contain user stories with acceptance criteria in the format 'As a [User], I want to [Action] so that [Benefit]'?",
      critical: true,
    },
    {
      id: "has_out_of_scope",
      description: "Does the PRD explicitly define what is out of scope?",
      critical: true,
    },
    {
      id: "has_functional_requirements",
      description:
        "Does the PRD include functional requirements with business rules and edge cases?",
      critical: true,
    },
    {
      id: "has_non_functional_requirements",
      description:
        "Does the PRD include non-functional requirements (performance, security, compatibility)?",
      critical: false,
    },
    {
      id: "has_risks_and_dependencies",
      description:
        "Does the PRD list dependencies and risks with mitigation strategies?",
      critical: false,
    },
    {
      id: "specific_not_vague",
      description:
        "Are requirements specific and measurable rather than vague (e.g., 'latency < 200ms' instead of 'should be fast')?",
      critical: true,
    },
    {
      id: "qa_format_compliant",
      description:
        "If the agent asked clarifying questions to the user (target audience, constraints, timeline), did each question follow FR-UNIVERSAL.QA-FORMAT — i.e. each question is a numbered list item (a line starting with '1.', '2.', ...), NOT a bold heading like '**1. Title**', a Markdown heading, or a bare paragraph? If the agent did not ask any clarifying questions, this criterion is vacuously satisfied (mark as passed).",
      critical: true,
    },
  ];
}();
