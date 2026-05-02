function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) {
    out |= ba[i] ^ bb[i];
  }
  return out === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  if (url.searchParams.has("token") || url.searchParams.has("x-keepalive-token")) {
    return json({ error: "Token must be sent in Authorization header only." }, 400);
  }

  const expectedToken = Deno.env.get("KEEPALIVE_TOKEN");
  if (!expectedToken) {
    return json({ error: "Missing KEEPALIVE_TOKEN secret." }, 500);
  }

  const auth = request.headers.get("Authorization");
  const bearerMatch = auth?.match(/^Bearer\s+(.+)$/i);
  const providedToken = bearerMatch?.[1]?.trim() ?? "";

  if (!providedToken || !timingSafeEqualString(providedToken, expectedToken)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const startedAt = Date.now();

  return json({
    ok: true,
    service: "keep-alive",
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  });
});
