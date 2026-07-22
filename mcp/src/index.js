import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

// Remote MCP server for the Let's Go! places app. Streamable HTTP (stateless
// JSON), bearer-token gated, an HTTP client of the main API — it never opens the
// database. Deploy as its own Railway service pointing API_BASE_URL at the app.
//
// Env: PORT, MCP_BEARER_TOKEN (gate; open if unset), API_BASE_URL, API_TOKEN.

const PORT = parseInt(process.env.PORT || '3002', 10);

function authorized(req) {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) return true; // unconfigured -> open (dev)
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.get('x-api-token');
  return token === expected;
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/mcp', async (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: req.body?.id ?? null });
  }
  // Fresh server + transport per request (stateless — avoids request-id collisions).
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { transport.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: req.body?.id ?? null });
    }
  }
});

app.listen(PORT, () => {
  console.error(`lets-go-mcp-server listening on http://localhost:${PORT}/mcp`);
});
