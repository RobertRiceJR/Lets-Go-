# lets-go-mcp-server

Remote MCP server that gives Claude (phone/desktop) access to the **Let's Go!** places app. It's a thin, authenticated **HTTP client of the main API** — it never opens the database, so it can run as its own Railway service.

## Transport & auth

- **Streamable HTTP (stateless JSON)** at `POST /mcp`; `GET /health` for Railway.
- Gated by a **bearer token** (`MCP_BEARER_TOKEN`). Open when the var is unset (local dev).
- Writes to the main API carry `API_TOKEN` (the API's `requireToken` secret).

> The exact auth mechanism the Claude mobile **custom connector** accepts (static bearer vs OAuth) must be confirmed before wiring the phone; if OAuth is required, add it at this layer (the tools/API don't change).

## Env

| Var | Meaning |
|---|---|
| `PORT` | listen port (Railway sets it) |
| `MCP_BEARER_TOKEN` | token the connector must present |
| `API_BASE_URL` | main app base URL (Railway private hostname in prod) |
| `API_TOKEN` | shared secret the main API requires for writes |

## Tools

Read: `lets_go_search_locations`, `lets_go_get_location`, `lets_go_pick_for_me`, `lets_go_list_options`.
Write: `lets_go_create_location`, `lets_go_add_activity`, `lets_go_log_visit`, `lets_go_add_rating`, `lets_go_set_status`.

Destructive tools (delete) are intentionally omitted from v1 until write-auth is proven in prod.

## Run

```bash
npm install
API_BASE_URL=http://localhost:3001 npm start
```
