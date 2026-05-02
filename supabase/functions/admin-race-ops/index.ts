import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const MAX_RELAY_POINTS = 50;
const RELAY_POINT_NAME_MAX = 120;

const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const createRacePayloadSchema = z.object({
  action: z.literal("createRaceWithPoints"),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(120),
  relayPoints: z
    .array(z.string().trim().min(1).max(RELAY_POINT_NAME_MAX))
    .min(1)
    .max(MAX_RELAY_POINTS),
});

const approveSignupPayloadSchema = z.object({
  action: z.literal("approveSignupToRaceAtomic"),
  signupId: z.string().uuid(),
  raceId: z.string().uuid(),
});

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

function safeDbError(): string {
  return "Database operation failed.";
}

async function assertActiveAdmin(adminClient: SupabaseClient, callerEmail: string): Promise<boolean> {
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
  adminClient: SupabaseClient,
  payload: z.infer<typeof createRacePayloadSchema>,
  request: Request,
) {
  const rpcResponse = await adminClient.rpc("create_race_with_points", {
    p_name: payload.name,
    p_code: payload.code,
    p_relay_points: payload.relayPoints,
  });
  if (rpcResponse.error || !rpcResponse.data) {
    console.error("create_race_with_points failed", rpcResponse.error);
    return json(request, { error: safeDbError() }, 400);
  }
  return json(request, { data: rpcResponse.data });
}

async function handleApproveSignup(
  adminClient: SupabaseClient,
  payload: z.infer<typeof approveSignupPayloadSchema>,
  request: Request,
) {
  const signupResponse = await adminClient
    .from("team_signup_requests")
    .select("captain_discord, teammates_discord")
    .eq("id", payload.signupId)
    .limit(1)
    .maybeSingle();
  if (signupResponse.error || !signupResponse.data) {
    console.error("signup lookup failed", signupResponse.error);
    return json(request, { error: safeDbError() }, 400);
  }

  const rpcResponse = await adminClient.rpc("approve_signup_to_race_atomic", {
    p_signup_id: payload.signupId,
    p_race_id: payload.raceId,
  });
  if (rpcResponse.error || !rpcResponse.data) {
    console.error("approve_signup_to_race_atomic failed", rpcResponse.error);
    return json(request, { error: safeDbError() }, 400);
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

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body." }, 400);
  }

  try {
    const action = (rawPayload as Record<string, unknown>)?.action;
    if (action === "createRaceWithPoints") {
      const payload = createRacePayloadSchema.parse(rawPayload);
      return handleCreateRaceWithPoints(adminClient, payload, request);
    }
    if (action === "approveSignupToRaceAtomic") {
      const payload = approveSignupPayloadSchema.parse(rawPayload);
      return handleApproveSignup(adminClient, payload, request);
    }
    return json(request, { error: "Unsupported action." }, 400);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn("admin-race-ops validation", error.flatten());
      return json(request, { error: "Invalid request payload." }, 400);
    }
    console.error("admin-race-ops error", error);
    return json(request, { error: error instanceof Error ? error.message : "Unknown admin race ops error." }, 400);
  }
});
