// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getAllowedOrigin(request: Request): string | null {
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configuredOrigins.length === 0) return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return configuredOrigins.includes(origin) ? origin : null;
}

function corsHeadersFor(request: Request): HeadersInit {
  const origin = getAllowedOrigin(request);
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin ?? "null",
    Vary: "Origin",
  };
}

function json(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeadersFor(request) },
  });
}

function normalizeMembers(captainDiscord: string, teammatesDiscord: string | null): string[] {
  const teammates = (teammatesDiscord ?? "")
    .split(/[,\n]/g)
    .map((member) => member.trim())
    .filter(Boolean);
  const deduped = new Set<string>([captainDiscord.trim(), ...teammates]);
  return [...deduped];
}

function readRequiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string") return "";
  return value.trim();
}

async function assertActiveAdmin(adminClient: ReturnType<typeof createClient>, callerEmail: string): Promise<boolean> {
  const adminResponse = await adminClient
    .from("admin_users")
    .select("email")
    .eq("email", callerEmail)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (adminResponse.error) return false;
  return Boolean(adminResponse.data);
}

async function handleCreateRaceWithPoints(
  adminClient: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  request: Request,
) {
  const raceName = readRequiredString(payload, "name");
  const code = readRequiredString(payload, "code");
  const relayPoints = Array.isArray(payload.relayPoints) ? payload.relayPoints.map(String) : [];
  if (!raceName || !code) {
    return json(request, { error: "Race name and code are required." }, 400);
  }

  const rpcResponse = await adminClient.rpc("create_race_with_points", {
    p_name: raceName,
    p_code: code,
    p_relay_points: relayPoints,
  });
  if (rpcResponse.error || !rpcResponse.data) {
    return json(request, { error: rpcResponse.error?.message ?? "Failed to create race." }, 400);
  }
  return json(request, { data: rpcResponse.data });
}

async function handleApproveSignup(
  adminClient: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  request: Request,
) {
  const signupId = readRequiredString(payload, "signupId");
  const raceId = readRequiredString(payload, "raceId");
  if (!signupId || !raceId) {
    return json(request, { error: "Signup ID and race ID are required." }, 400);
  }

  const signupResponse = await adminClient
    .from("team_signup_requests")
    .select("captain_discord, teammates_discord")
    .eq("id", signupId)
    .limit(1)
    .maybeSingle();
  if (signupResponse.error || !signupResponse.data) {
    return json(request, { error: signupResponse.error?.message ?? "Signup request not found." }, 400);
  }

  const rpcResponse = await adminClient.rpc("approve_signup_to_race_atomic", {
    p_signup_id: signupId,
    p_race_id: raceId,
  });
  if (rpcResponse.error || !rpcResponse.data) {
    return json(request, { error: rpcResponse.error?.message ?? "Failed to approve signup request." }, 400);
  }

  const team = rpcResponse.data as Record<string, unknown>;
  const members = normalizeMembers(
    String(signupResponse.data.captain_discord ?? ""),
    (signupResponse.data.teammates_discord as string | null) ?? null,
  );
  return json(request, { data: { ...team, members } });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(request) });
  }

  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(
      request,
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY." },
      500,
    );
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(request, { error: "Missing bearer token." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userResponse = await userClient.auth.getUser();
  const user = userResponse.data.user;
  if (userResponse.error || !user?.email) {
    return json(request, { error: "Unauthorized user." }, 401);
  }
  const callerEmail = user.email.toLowerCase();

  const hasAdminAccess = await assertActiveAdmin(adminClient, callerEmail);
  if (!hasAdminAccess) return json(request, { error: "Admin access required." }, 403);

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const action = payload.action;

    if (action === "createRaceWithPoints") {
      return handleCreateRaceWithPoints(adminClient, payload, request);
    }

    if (action === "approveSignupToRaceAtomic") {
      return handleApproveSignup(adminClient, payload, request);
    }

    return json(request, { error: "Unsupported action." }, 400);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Unknown admin race ops error." }, 400);
  }
});
