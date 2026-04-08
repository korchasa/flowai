import { BraveSearchClient } from "./client.ts";
import { createRunContext } from "../../run-context/run-context.ts";
import type { Logger } from "../../logger/logger.ts";

async function main() {
    console.log("Starting Brave Search verification...");

    // Create a mock context for logging
    const ctx = createRunContext({
        logger: {
            debug: () => {},
            info: console.log,
            warn: console.warn,
            error: console.error,
        } as unknown as Logger,
        debugDir: "./tmp/debug",
    });

    try {
        const client = new BraveSearchClient(ctx);
        const query = "typescript best practices";

        console.log(`Searching for: "${query}"...`);

        const result = await client.search({
            q: query,
            count: 3
        });

        console.log("\nSearch Results:");
        console.log("--------------");

        if (result.web?.results) {
            result.web.results.forEach((item, index) => {
                console.log(`\n${index + 1}. ${item.title}`);
                console.log(`   URL: ${item.url}`);
                console.log(`   Description: ${item.description}`);
            });
        } else {
            console.log("No web search results found.");
        }

        console.log("\nVerification completed successfully.");

    } catch (error) {
        console.error("Verification failed:", error);
        Deno.exit(1);
    }
}

if (import.meta.main) {
    main().catch(console.error);
}
