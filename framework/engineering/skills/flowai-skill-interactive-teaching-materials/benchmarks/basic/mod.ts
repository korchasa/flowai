import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InteractiveTeachingBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-basic";
  name = "Create Interactive State Diagram Teaching Material";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = {
    PROJECT_NAME: "LearnHTTP",
  };
  stepTimeoutMs = 420_000;

  userQuery =
    "/flowai-skill-interactive-teaching-materials Create an interactive teaching material about HTTP request lifecycle. Show the states: DNS Resolution, TCP Handshake, TLS Handshake, Request Sent, Response Received. Make it explorable with clickable states.";

  checklist = [
    {
      id: "html_file_created",
      description:
        "Did the agent create an HTML file with the interactive teaching material?",
      critical: true,
    },
    {
      id: "diagram_as_navigation",
      description:
        "Does the material use a diagram (state/flow/sequence) as the navigation surface with clickable states?",
      critical: true,
    },
    {
      id: "detail_panels",
      description:
        "Does clicking a state/transition reveal detailed content in a panel or section?",
      critical: true,
    },
    {
      id: "all_states_present",
      description:
        "Are all requested states present (DNS Resolution, TCP Handshake, TLS Handshake, Request, Response)?",
      critical: true,
    },
    {
      id: "explicit_transitions",
      description:
        "Are transitions between states explicit and labeled (not just arrows)?",
      critical: false,
    },
    {
      id: "substance_in_details",
      description:
        "Do detail panels contain substantive content (not just state names — real explanations)?",
      critical: true,
    },
    {
      id: "self_contained",
      description:
        "Is the HTML file self-contained (no external dependencies that would break offline)?",
      critical: false,
    },
  ];
}();
