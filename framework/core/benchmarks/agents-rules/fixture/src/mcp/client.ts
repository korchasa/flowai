/**
 * MCP (Model Context Protocol) client module.
 * Bridges MCP servers with Vercel AI SDK tools, handling connection and tool conversion.
 *
 * @module mcp-client
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  ListToolsResultSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { jsonSchema, type Tool } from "ai";
import type { Logger } from "../logger/logger.ts";

export type McpServerConfig =
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type: "sse"; url: string };

/**
 * Wrapper around MCP Client to handle connection and tool conversion
 * for Vercel AI SDK.
 */
export class McpClientWrapper {
  private client: Client;
  private transport: StdioClientTransport | SSEClientTransport;
  private connected = false;

  constructor(
    config: McpServerConfig,
    private readonly logger: Logger,
    private readonly name: string
  ) {
    if (config.type === "stdio") {
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });
    } else {
      this.transport = new SSEClientTransport(new URL(config.url));
    }

    this.client = new Client(
      {
        name: "ai-skel-ts-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.logger.debug(`[MCP:${this.name}] Connecting...`);
      await this.client.connect(this.transport);
      this.connected = true;
      this.logger.info(`[MCP:${this.name}] Connected`);
    } catch (error) {
      this.logger.error(`[MCP:${this.name}] Connection failed`, { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.close();
      this.connected = false;
      this.logger.info(`[MCP:${this.name}] Disconnected`);
    } catch (error) {
      this.logger.error(`[MCP:${this.name}] Disconnection error`, { error });
      // Don't throw on disconnect error, just log
    }
  }

  /**
   * Fetches tools from the MCP server and converts them to AI SDK Tools.
   */
  async getTools(): Promise<Record<string, Tool>> {
    if (!this.connected) {
      throw new Error(`MCP Client ${this.name} is not connected`);
    }

    try {
      const result = await this.client.request(
        { method: "tools/list" },
        ListToolsResultSchema
      );

      const tools: Record<string, Tool> = {};

      for (const tool of result.tools) {
        // Namesapce the tool to avoid collisions: "serverName__toolName"
        const toolName = `${this.name}__${tool.name}`;
        
        tools[toolName] = {
          description: tool.description,
          inputSchema: jsonSchema(tool.inputSchema as Record<string, unknown>),
          execute: async (args: unknown) => {
            this.logger.debug(`[MCP:${this.name}] Calling tool ${tool.name}`, { args });
            const callResult = await this.client.request(
              {
                method: "tools/call",
                params: {
                  name: tool.name,
                  arguments: args as Record<string, unknown>,
                },
              },
              CallToolResultSchema
            );

            const textContent = (callResult.content as Array<{ type: string; text?: string }>)
              .filter((c) => c.type === "text")
              .map((c) => c.text)
              .join("\n");
            
            return textContent || JSON.stringify(callResult.content);
          },
        };
      }
      
      return tools;
    } catch (error) {
      this.logger.error(`[MCP:${this.name}] Failed to list tools`, { error });
      throw error;
    }
  }
}
