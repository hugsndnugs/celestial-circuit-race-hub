// @ts-nocheck
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedToken = Deno.env.get("KEEPALIVE_TOKEN");
  if (!expectedToken) {
    return json({ error: "Missing KEEPALIVE_TOKEN secret." }, 500);
  }

  const providedToken = request.headers.get("x-keepalive-token");
  if (providedToken !== expectedToken) {
    return json({ error: "Unauthorized" }, 401);
  }

  const startedAt = Date.now();

  return json({
    ok: true,
    service: "keep-alive",
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startedAt
  });
});
