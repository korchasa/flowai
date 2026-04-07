import { Agent } from "./agent.ts";
import { createLlmRequester } from "../llm/factory.ts";
import { ModelURI } from "../llm/llm.ts";
import { CostTracker } from "../cost-tracker/cost-tracker.ts";
import { createRunContext } from "../run-context/run-context.ts";
import { Logger } from "../logger/logger.ts";
import { z } from "zod";
import { zodSchema, type Tool } from "ai";

/**
 * A demo showing how to use the Agent with a dummy tool.
 */
async function main() {
  const logger = new Logger({ context: "agent-demo" });
  const costTracker = CostTracker.getInstance();
  const ctx = createRunContext({
    logger,
    debugDir: "./tmp/debug/agent-demo",
  });

  // 1. Setup LLM (using mock for demo if no API key)
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") || "dummy-key";
  const modelUri = ModelURI.parse(`openrouter/meta-llama/llama-3-8b-instruct?apiKey=${apiKey}`);
  
  const llm = createLlmRequester({
    modelUri,
    logger,
    costTracker,
    ctx,
  });

  // 2. Define a local tool (as if it came from MCP)
  const weatherTool: Tool = {
    description: "Get current weather in a city",
    inputSchema: zodSchema(z.object({
      city: z.string().describe("The city to get weather for"),
    })),
    execute: ({ city }: { city: string }) => {
      logger.info(`[Tool] Fetching weather for ${city}...`);
      return Promise.resolve(`The weather in ${city} is sunny and 25°C.`);
    },
  };

  // 3. Create Agent
  const agent = new Agent({
    llm,
    ctx,
    systemPrompt: "You are a helpful assistant with access to tools. If you need to know the weather, use the weather tool.",
    mcpClients: undefined,
    compactor: undefined,
    tools: undefined,
  });

  // Mock init to add our dummy tool since we don't have a real MCP server running
  await agent.init();
  // Manually add tool for demo purposes
  // deno-lint-ignore no-explicit-any
  (agent as any).tools["weather_tool"] = weatherTool;

  // 4. Chat
  logger.info("--- Starting Chat ---");
  const response = await agent.chat("What's the weather like in Paris?");
  logger.info(`Agent: ${response}`);

  const history = agent.getHistory();
  logger.info(`History length: ${history.length}`);
  
  const report = costTracker.getReport();
  logger.info(`Total Cost: $${report.totalCost.toFixed(6)}`);
}

if (import.meta.main) {
  main().catch(console.error);
}
