// Thin HTTP client for the Let's Go! main API. The MCP server never touches the
// database — it calls the same REST API the web app uses. Reads are open; writes
// send the shared service token (API_TOKEN) the API's requireToken expects.

export async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const base = process.env.API_BASE_URL || 'http://localhost:3001';
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  const token = process.env.API_TOKEN;
  if (auth && token) headers.authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(base + path, { method, headers, body: body != null ? JSON.stringify(body) : undefined });
  } catch (e) {
    const err = new Error(`could not reach the Let's Go API at ${base} (${e.message})`);
    err.status = 0;
    throw err;
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
