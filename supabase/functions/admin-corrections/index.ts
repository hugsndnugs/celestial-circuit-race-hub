// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
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
    idempotencyKey: row.idempotency_key
  };
}

async function recordOutboxEvent(
  supabase: ReturnType<typeof createClient>,
  raceId: string,
  correctionRequestId: string | null,
  topic: string,
  payload: Record<string, unknown>
) {
  const { error } = await supabase.from("notification_outbox").insert([
    {
      race_id: raceId,
      correction_request_id: correctionRequestId,
      topic,
      payload,
      status: "pending"
    }
  ]);
  if (error) throw new Error(error.message);
}

async function recordAuditEntry(
  supabase: ReturnType<typeof createClient>,
  raceId: string,
  correctionRequestId: string,
  actor: string,
  action: string,
  metadata: Record<string, unknown>
) {
  const { error } = await supabase.from("audit_entries").insert([
    {
      race_id: raceId,
      correction_request_id: correctionRequestId,
      actor,
      action,
      metadata
    }
  ]);
  if (error) throw new Error(error.message);
}

async function notifyDiscord(message: string): Promise<{ ok: boolean; error?: string }> {
  const proxyUrl = Deno.env.get("NEXT_PUBLIC_DISCORD_PROXY_URL");
  if (!proxyUrl) return { ok: true };
  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
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
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const action = payload.action;

    if (action === "create") {
      const {
        raceId,
        supersedesEventId,
        requestedBy,
        reason,
        effectiveRecordedAt,
        idempotencyKey
      } = payload as {
        raceId: string;
        supersedesEventId: string;
        requestedBy: string;
        reason: string;
        effectiveRecordedAt: string;
        idempotencyKey: string;
      };

      const insert = await supabase
        .from("correction_requests")
        .insert([
          {
            race_id: raceId,
            supersedes_event_id: supersedesEventId,
            requested_by: requestedBy,
            reason,
            status: "pending",
            effective_recorded_at: effectiveRecordedAt,
            idempotency_key: idempotencyKey
          }
        ])
        .select(
          "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key"
        )
        .single<CorrectionRequestRow>();
      if (insert.error || !insert.data) {
        return json({ error: insert.error?.message ?? "Failed to create correction request." }, 400);
      }

      await recordOutboxEvent(supabase, insert.data.race_id, insert.data.id, "correction_requested", {
        requestId: insert.data.id,
        supersedesEventId
      });
      return json({ data: mapRequest(insert.data) });
    }

    if (action === "review") {
      const { requestId, reviewedBy, reviewAction, reviewNotes } = payload as {
        requestId: string;
        reviewedBy: string;
        reviewAction: "approve" | "reject";
        reviewNotes?: string;
      };
      const requestResponse = await supabase
        .from("correction_requests")
        .select(
          "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key"
        )
        .eq("id", requestId)
        .single<CorrectionRequestRow>();
      if (requestResponse.error || !requestResponse.data) {
        return json({ error: "Correction request not found." }, 404);
      }
      const requestRow = requestResponse.data;
      if (requestRow.status !== "pending") {
        return json({ error: `Request is already ${requestRow.status}.` }, 400);
      }

      if (reviewAction === "reject") {
        const rejectedAt = new Date().toISOString();
        const update = await supabase
          .from("correction_requests")
          .update({
            status: "rejected",
            reviewed_by: reviewedBy,
            reviewed_at: rejectedAt,
            review_notes: reviewNotes?.trim() || null
          })
          .eq("id", requestRow.id)
          .select(
            "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key"
          )
          .single<CorrectionRequestRow>();
        if (update.error || !update.data) {
          return json({ error: update.error?.message ?? "Failed to reject request." }, 400);
        }
        await recordAuditEntry(supabase, requestRow.race_id, requestRow.id, reviewedBy, "correction_rejected", {
          reviewNotes: reviewNotes ?? null
        });
        await recordOutboxEvent(supabase, requestRow.race_id, requestRow.id, "correction_rejected", {
          requestId: requestRow.id
        });
        return json({ data: mapRequest(update.data) });
      }

      const sourceResponse = await supabase
        .from("relay_events")
        .select("id, race_id, team_id, relay_point_id, invalidated_by_event_id")
        .eq("id", requestRow.supersedes_event_id)
        .single<{
          id: string;
          race_id: string;
          team_id: string;
          relay_point_id: string;
          invalidated_by_event_id: string | null;
        }>();
      if (sourceResponse.error || !sourceResponse.data) {
        return json({ error: "Superseded event not found." }, 404);
      }
      if (sourceResponse.data.invalidated_by_event_id) {
        return json({ error: "Superseded event is already invalidated." }, 400);
      }

      const correctionInsert = await supabase
        .from("relay_events")
        .insert([
          {
            race_id: sourceResponse.data.race_id,
            team_id: sourceResponse.data.team_id,
            relay_point_id: sourceResponse.data.relay_point_id,
            recorded_by: reviewedBy,
            source: "admin_correction",
            supersedes_event_id: sourceResponse.data.id,
            correction_reason: requestRow.reason,
            invalidated_by_event_id: null,
            effective_recorded_at: requestRow.effective_recorded_at
          }
        ])
        .select("id")
        .single<{ id: string }>();
      if (correctionInsert.error || !correctionInsert.data) {
        return json({ error: correctionInsert.error?.message ?? "Failed to insert correction event." }, 400);
      }

      const invalidation = await supabase
        .from("relay_events")
        .update({ invalidated_by_event_id: correctionInsert.data.id })
        .eq("id", sourceResponse.data.id)
        .is("invalidated_by_event_id", null);
      if (invalidation.error) {
        await supabase
          .from("correction_requests")
          .update({
            status: "failed",
            reviewed_by: reviewedBy,
            reviewed_at: new Date().toISOString(),
            review_notes: "Failed to invalidate superseded event after correction insert."
          })
          .eq("id", requestRow.id);
        await recordOutboxEvent(supabase, requestRow.race_id, requestRow.id, "correction_failed", {
          requestId: requestRow.id,
          reason: invalidation.error.message
        });
        return json({ error: invalidation.error.message }, 400);
      }

      const requestUpdate = await supabase
        .from("correction_requests")
        .update({
          status: "applied",
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes?.trim() || null,
          applied_event_id: correctionInsert.data.id
        })
        .eq("id", requestRow.id)
        .select(
          "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key"
        )
        .single<CorrectionRequestRow>();
      if (requestUpdate.error || !requestUpdate.data) {
        return json({ error: requestUpdate.error?.message ?? "Failed to finalize request." }, 400);
      }

      await recordAuditEntry(supabase, requestRow.race_id, requestRow.id, reviewedBy, "correction_applied", {
        appliedEventId: correctionInsert.data.id
      });
      await recordOutboxEvent(supabase, requestRow.race_id, requestRow.id, "correction_applied", {
        requestId: requestRow.id,
        appliedEventId: correctionInsert.data.id
      });

      const notifyResult = await notifyDiscord(
        `Correction applied: race=${requestRow.race_id} request=${requestRow.id} event=${correctionInsert.data.id}`
      );
      await supabase
        .from("notification_outbox")
        .update({
          status: notifyResult.ok ? "sent" : "failed",
          attempts: 1,
          sent_at: notifyResult.ok ? new Date().toISOString() : null,
          last_error: notifyResult.ok ? null : notifyResult.error ?? "Failed to send"
        })
        .eq("topic", "correction_applied")
        .eq("correction_request_id", requestRow.id)
        .is("sent_at", null);

      return json({ data: mapRequest(requestUpdate.data) });
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown admin correction error." }, 400);
  }
});
