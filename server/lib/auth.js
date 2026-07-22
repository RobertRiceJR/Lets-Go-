// Bearer-token gate for the new places/export surface the remote MCP calls.
//
// If API_TOKEN is unset (local dev / unconfigured) the gate is OPEN so the app
// runs without config. In prod, set API_TOKEN and every gated route requires
// `Authorization: Bearer <token>` (or the `x-api-token` header).
//
// NOTE: the same-origin React client uses the OPEN compat /api/activities
// routes, so the web UI is unaffected — this protects only the new surface.
// Hardening the compat/read routes is a later, deliberate step.
function requireToken(req, res, next) {
  const expected = process.env.API_TOKEN;
  if (!expected) return next(); // unconfigured -> open (dev)
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.get('x-api-token');
  if (token && token === expected) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { requireToken };
