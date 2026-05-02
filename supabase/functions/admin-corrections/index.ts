import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

type CorrectionRequestStatus = "pending" | "approved" | "rejected" | "applied" | "failed";

interface CorrectionRequestRow {
  id: string;
  race_id: string;
  supersedes_event_id: string;
  requested_by: string;
  reason: string;
  status: CorrectionRequestStatus;
  submitted_at: string;
  effective_recorded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  applied_event_id: string | null;
  idempotency_key: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const createPayloadSchema = z.object({
  action: z.literal("create"),
  raceId: z.string().uuid(),
  supersedesEventId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  effectiveRecordedAt: z.string().trim().min(1).max(40),
  idempotencyKey: z.string().trim().min(1).max(200),
});

const reviewPayloadSchema = z.object({
  action: z.literal("review"),
  requestId: z.string().uuid(),
  reviewAction: z.enum(["approve", "reject"]),
  reviewNotes: z.string().max(4000).optional(),
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

function mapRequest(row: CorrectionRequestRow) {
  return {
    id: row.id,
    raceId: row.race_id,
    supersedesEventId: row.supersedes_event_id,
    requestedBy: row.requested_by,
    reason: row.reason,
    status: row.status,
    submittedAt: row.submitted_at,
    effectiveRecordedAt: row.effective_recorded_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    appliedEventId: row.applied_event_id,
    idempotencyKey: row.idempotency_key,
  };
}

function safeDbError(_err: unknown): string {
  return "Database operation failed.";
}

async function recordOutboxEvent(
  supabase: SupabaseClient,
  raceId: string,
  correctionRequestId: string | null,
  topic: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from("notification_outbox")
    .insert([
      {
        race_id: raceId,
        correction_request_id: correctionRequestId,
        topic,
        payload,
        status: "pending",
      },
    ])
    .select("id")
    .single();
  if (error || !data?.id) {
    console.error("notification_outbox insert failed", error);
    throw new Error(safeDbError(error));
  }
  return data.id as string;
}

async function recordAuditEntry(
  supabase: SupabaseClient,
  raceId: string,
  correctionRequestId: string,
  actor: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("audit_entries").insert([
    {
      race_id: raceId,
      correction_request_id: correctionRequestId,
      actor,
      action,
      metadata,
    },
  ]);
  if (error) {
    console.error("audit_entries insert failed", error);
    throw new Error(safeDbError(error));
  }
}

async function notifyDiscord(message: string): Promise<{ ok: boolean; error?: string }> {
  const proxyUrl = Deno.env.get("NEXT_PUBLIC_DISCORD_PROXY_URL");
  if (!proxyUrl) return { ok: true };
  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      return { ok: false, error: `Discord proxy responded ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Discord send failed" };
  }
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
  const userResponse = await userClient.auth.getUser();
  const user = userResponse.data.user;
  if (userResponse.error || !user?.email) {
    return json(request, { error: "Unauthorized user." }, 401);
  }
  const reviewerEmail = user.email.toLowerCase();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminCheck = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", reviewerEmail)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (adminCheck.error || !adminCheck.data) {
    return json(request, { error: "Admin access required." }, 403);
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body." }, 400);
  }

  const actionUnknown = (rawPayload as Record<string, unknown>)?.action;
  try {
    if (actionUnknown === "create") {
      const payload = createPayloadSchema.parse(rawPayload);

      const insert = await supabase
        .from("correction_requests")
        .insert([
          {
            race_id: payload.raceId,
            supersedes_event_id: payload.supersedesEventId,
            requested_by: reviewerEmail,
            reason: payload.reason,
            status: "pending",
            effective_recorded_at: payload.effectiveRecordedAt,
            idempotency_key: payload.idempotencyKey,
          },
        ])
        .select(
          "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key",
        )
        .single<CorrectionRequestRow>();
      if (insert.error || !insert.data) {
        console.error("correction_requests insert failed", insert.error);
        return json(request, { error: safeDbError(insert.error) }, 400);
      }

      await recordOutboxEvent(supabase, insert.data.race_id, insert.data.id, "correction_requested", {
        requestId: insert.data.id,
        supersedesEventId: payload.supersedesEventId,
      });
      return json(request, { data: mapRequest(insert.data) });
    }

    if (actionUnknown === "review") {
      const payload = reviewPayloadSchema.parse(rawPayload);

      const requestResponse = await supabase
        .from("correction_requests")
        .select(
          "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key",
        )
        .eq("id", payload.requestId)
        .single<CorrectionRequestRow>();
      if (requestResponse.error || !requestResponse.data) {
        return json(request, { error: "Correction request not found." }, 404);
      }
      const requestRow = requestResponse.data;
      if (requestRow.status !== "pending") {
        return json(request, { error: `Request is already ${requestRow.status}.` }, 400);
      }

      if (payload.reviewAction === "reject") {
        const rejectedAt = new Date().toISOString();
        const update = await supabase
          .from("correction_requests")
          .update({
            status: "rejected",
            reviewed_by: reviewerEmail,
            reviewed_at: rejectedAt,
            review_notes: payload.reviewNotes?.trim() || null,
          })
          .eq("id", requestRow.id)
          .select(
            "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key",
          )
          .single<CorrectionRequestRow>();
        if (update.error || !update.data) {
          console.error("correction_requests reject update failed", update.error);
          return json(request, { error: safeDbError(update.error) }, 400);
        }
        await recordAuditEntry(supabase, requestRow.race_id, requestRow.id, reviewerEmail, "correction_rejected", {
          reviewNotes: payload.reviewNotes ?? null,
        });
        await recordOutboxEvent(supabase, requestRow.race_id, requestRow.id, "correction_rejected", {
          requestId: requestRow.id,
        });
        return json(request, { data: mapRequest(update.data) });
      }

      const applyResponse = await supabase.rpc("apply_correction_request_atomic", {
        p_request_id: requestRow.id,
        p_reviewed_by: reviewerEmail,
        p_review_notes: payload.reviewNotes?.trim() || null,
      });
      if (applyResponse.error || !applyResponse.data) {
        console.error("apply_correction_request_atomic failed", applyResponse.error);
        return json(request, { error: safeDbError(applyResponse.error) }, 400);
      }
      const requestUpdate = applyResponse.data as CorrectionRequestRow;
      const appliedEventId = requestUpdate.applied_event_id;
      if (!appliedEventId) {
        return json(request, { error: "Correction applied without resulting event." }, 400);
      }

      await recordAuditEntry(supabase, requestRow.race_id, requestRow.id, reviewerEmail, "correction_applied", {
        appliedEventId,
      });
      const outboxId = await recordOutboxEvent(supabase, requestRow.race_id, requestRow.id, "correction_applied", {
        requestId: requestRow.id,
        appliedEventId,
      });

      const notifyResult = await notifyDiscord(
        `Correction applied: race=${requestRow.race_id} request=${requestRow.id} event=${appliedEventId}`,
      );
      const { error: outboxUpdateErr } = await supabase
        .from("notification_outbox")
        .update({
          status: notifyResult.ok ? "sent" : "failed",
          attempts: 1,
          sent_at: notifyResult.ok ? new Date().toISOString() : null,
          last_error: notifyResult.ok ? null : notifyResult.error ?? "Failed to send",
        })
        .eq("id", outboxId);
      if (outboxUpdateErr) {
        console.error("notification_outbox update failed", outboxUpdateErr);
      }

      return json(request, { data: mapRequest(requestUpdate) });
    }

    return json(request, { error: "Unsupported action." }, 400);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn("admin-corrections validation", error.flatten());
      return json(request, { error: "Invalid request payload." }, 400);
    }
    console.error("admin-corrections error", error);
    return json(request, { error: error instanceof Error ? error.message : "Unknown admin correction error." }, 400);
  }
});
