#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { registerReadTask } from "./tools/read-task.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = new McpServer({
    name: "jira-read-mcp",
    version: "1.0.0",
  });

  registerReadTask(server, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
