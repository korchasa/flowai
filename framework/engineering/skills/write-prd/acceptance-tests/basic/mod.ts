import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WritePrdBasicBench = new class extends AcceptanceTestScenario {
  id = "write-prd-basic";
  name = "Write PRD for User Notification Feature";
  skill = "write-prd";
  agentsTemplateVars = {
    PROJECT_NAME: "ShopNotify",
  };
  stepTimeoutMs = 420_000;

  userQuery =
    "/write-prd Write a PRD for adding push notification support to our mobile app. Users currently have no way to receive alerts about order status changes. We have 50K DAU and process about 10K orders daily. Target: reduce support tickets about order status by 40%.";

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
      id: "targets_asked_with_recommendation",
      description:
        "The request gives only the business target (40% fewer order-status tickets) and the scale (50K DAU, 10K orders/day). Before writing the PRD, did the agent ask the user about the quantitative targets the request does not give — at least delivery latency and the supported OS versions or the guardrail thresholds — and offer a recommended numeric value with a short rationale for each one it asked about? Questions only about audience, constraints, scope or timeline do not count, and neither does listing the targets as open questions in the PRD.",
      critical: true,
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
        "Did every question the agent put to the user, in every turn, follow FR-UNIVERSAL.QA-FORMAT rule 1 — each question is a Markdown numbered list item, i.e. its line starts with a number, a dot and a space ('1. ', '2. ', ...)? Bold text AFTER the number does not matter: '1. **Which statuses trigger a push?**' passes. It fails when the number sits inside the bold ('**1. Title**'), when the question is a Markdown heading, or when the question is a bare paragraph with no number — this includes a single follow-up question in a later turn (for example about a conflict between two of the user's constraints), which must also be numbered ('1. ...'). Only questions are judged: options under a question (A., B., bullets) and other numbered items in the same reply (findings, steps, a summary) are not questions, and a question list that restarts at '1.' after such a list is still compliant. If the agent asked no questions at all, mark as passed.",
      critical: true,
    },
  ];
}();
