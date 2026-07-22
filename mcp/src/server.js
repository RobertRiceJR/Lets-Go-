import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.js';

// Build a fresh MCP server instance with all tools registered. A new instance
// is created per HTTP request (stateless transport) — see index.js.
export function createServer() {
  const server = new McpServer({ name: 'lets-go-mcp-server', version: '1.0.0' });
  registerTools(server);
  return server;
}
