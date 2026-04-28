import { computeLeaderboard } from "@/lib/controller/ranking";
import { getCurrentAdminIdentity, requireAdminUserEmail } from "@/lib/controller/admin-auth";
import { supabase } from "@/lib/controller/supabase-client";
import {
  correctionSchema,
  createCorrectionRequestSchema,
  createRaceSchema,
  createTeamSchema,
  raceIncidentNoteSchema,
  raceRefSchema,
  relayPassSchema,
} from "@/lib/controller/validators";
import {
  type CorrectionRequest,
  type LeaderboardRow,
  type Race,
  type RaceIncidentNote,
  type RelayEvent,
  type RelayPoint,
  type SignupRequest,
  type Team,
} from "@/lib/controller/types";

const RACE_CODE_WORDS = [
  "solar",
  "lunar",
  "nova",
  "aster",
  "comet",
  "orbit",
  "cosmic",
  "stellar",
  "pulse",
  "quasar",
  "ion",
  "aurora",
  "meteor",
  "zenith",
  "apollo",
  "equinox",
  "vector",
  "nebula",
];

function toRace(row: {
  id: string;
  code: string;
  name: string;
  status: "planned" | "active" | "completed";
  started_at: string | null;
  ended_at: string | null;
}): Race {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}
function toTeam(row: {
  id: string;
  race_id: string;
  name: string;
  members: string[];
  created_at: string;
}): Team {
  return {
    id: row.id,
    raceId: row.race_id,
    name: row.name,
    members: row.members,
    createdAt: row.created_at,
  };
}
function toSignupRequest(row: {
  id: string;
  team_name: string;
  captain_discord: string;
  teammates_discord: string | null;
  contact_email: string | null;
  notes: string | null;
  status: SignupRequest["status"];
  source: SignupRequest["source"];
  submitted_at: string;
}): SignupRequest {
  return {
    id: row.id,
    teamName: row.team_name,
    captainDiscord: row.captain_discord,
    teammatesDiscord: row.teammates_discord,
    contactEmail: row.contact_email,
    notes: row.notes,
    status: row.status,
    source: row.source,
    submittedAt: row.submitted_at,
  };
}

function signupMembersFromDiscord(signup: SignupRequest): string[] {
  const teammates = (signup.teammatesDiscord ?? "")
    .split(/[,\n]/g)
    .map((member) => member.trim())
    .filter(Boolean);
  const deduped = new Set<string>([signup.captainDiscord.trim(), ...teammates]);
  return [...deduped];
}

function toRelayPoint(row: {
  id: string;
  race_id: string;
  sequence_index: number;
  name: string;
}): RelayPoint {
  return {
    id: row.id,
    raceId: row.race_id,
    sequenceIndex: row.sequence_index,
    name: row.name,
  };
}

function toRelayEvent(row: {
  id: string;
  race_id: string;
  team_id: string;
  relay_point_id: string;
  recorded_at: string;
  effective_recorded_at: string;
  recorded_by: string;
  source: "marshal_tap" | "admin_correction";
  supersedes_event_id: string | null;
  correction_reason: string | null;
  invalidated_by_event_id: string | null;
}): RelayEvent {
  return {
    id: row.id,
    raceId: row.race_id,
    teamId: row.team_id,
    relayPointId: row.relay_point_id,
    recordedAt: row.recorded_at,
    effectiveRecordedAt: row.effective_recorded_at,
    recordedBy: row.recorded_by,
    source: row.source,
    supersedesEventId: row.supersedes_event_id,
    correctionReason: row.correction_reason,
    invalidatedByEventId: row.invalidated_by_event_id,
  };
}

type RelayEventRow = {
  id: string;
  race_id: string;
  team_id: string;
  relay_point_id: string;
  recorded_at: string;
  effective_recorded_at: string;
  recorded_by: string;
  source: "marshal_tap" | "admin_correction";
  supersedes_event_id: string | null;
  correction_reason: string | null;
  invalidated_by_event_id: string | null;
};

function asRelayEventRow(value: unknown): RelayEventRow {
  return value as RelayEventRow;
}

async function invokeAdminCorrections<T>(payload: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-corrections", {
    body: payload,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response from admin-corrections function.");
  }
  const parsed = data as { data?: T; error?: string };
  if (parsed.error) throw new Error(parsed.error);
  if (!parsed.data) throw new Error("Missing data from admin-corrections function.");
  return parsed.data;
}

async function requireAdminAccess(): Promise<string> {
  return requireAdminUserEmail();
}

function toCorrectionRequest(row: {
  id: string;
  race_id: string;
  supersedes_event_id: string;
  requested_by: string;
  reason: string;
  status: CorrectionRequest["status"];
  submitted_at: string;
  effective_recorded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  applied_event_id: string | null;
  idempotency_key: string;
}): CorrectionRequest {
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

function toRaceIncidentNote(row: {
  id: string;
  race_id: string;
  note: string;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
}): RaceIncidentNote {
  return {
    id: row.id,
    raceId: row.race_id,
    note: row.note,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? row.created_by,
    createdAt: row.created_at,
  };
}

async function resolveRace(reference: string): Promise<Race> {
  const raceRef = raceRefSchema.parse(reference);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raceRef
    );
  const query = supabase.from("races").select("id, code, name, status, started_at, ended_at").limit(1);
  const response = isUuid ? await query.eq("id", raceRef).single() : await query.eq("code", raceRef).single();
  if (response.error || !response.data) throw new Error("Race not found.");
  return toRace(response.data);
}

function generateRaceCode(): string {
  const first = RACE_CODE_WORDS[Math.floor(Math.random() * RACE_CODE_WORDS.length)];
  const second = RACE_CODE_WORDS[Math.floor(Math.random() * RACE_CODE_WORDS.length)];
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${first}-${second}-${suffix}`;
}

async function allocateRaceCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRaceCode();
    const { data, error } = await supabase.from("races").select("id").eq("code", code).limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return code;
  }
  throw new Error("Unable to allocate race code.");
}

export async function getRaces(): Promise<Race[]> {
  const { data, error } = await supabase.from("races").select("id, code, name, status, started_at, ended_at").order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRace);
}

export async function createRace(input: { name: string; relayPoints: string[] }): Promise<Race> {
  await requireAdminAccess();
  const payload = createRaceSchema.parse(input);
  const code = await allocateRaceCode();
  const { data, error } = await supabase
    .from("races")
    .insert([{ name: payload.name, status: "planned", code, started_at: null, ended_at: null }])
    .select("id, code, name, status, started_at, ended_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create race.");
  const race = toRace(data);
  const points = payload.relayPoints.map((name: string, index: number) => ({
    race_id: race.id,
    sequence_index: index + 1,
    name,
  }));
  const pointsInsert = await supabase.from("relay_points").insert(points);
  if (pointsInsert.error) throw new Error(pointsInsert.error.message);
  return race;
}

export async function startRace(raceRef: string): Promise<Race> {
  await requireAdminAccess();
  const race = await resolveRace(raceRef);
  if (race.status !== "planned") throw new Error("Race can only be started from planned state.");
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("races")
    .update({ status: "active", started_at: startedAt })
    .eq("id", race.id)
    .select("id, code, name, status, started_at, ended_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to start race.");
  return toRace(data);
}

export async function completeRace(raceRef: string): Promise<Race> {
  await requireAdminAccess();
  const race = await resolveRace(raceRef);
  if (race.status !== "active") throw new Error("Race can only be completed from active state.");
  const endedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("races")
    .update({ status: "completed", ended_at: endedAt })
    .eq("id", race.id)
    .select("id, code, name, status, started_at, ended_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to complete race.");
  return toRace(data);
}

export async function getTeamsByRace(raceRef: string): Promise<Team[]> {
  const race = await resolveRace(raceRef);
  const { data, error } = await supabase
    .from("teams")
    .select("id, race_id, name, members, created_at")
    .eq("race_id", race.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { id: string; race_id: string; name: string; members: unknown; created_at: string }) =>
    toTeam({ ...row, members: (row.members as string[]) ?? [] })
  );
}

export async function getRelayPointsByRace(raceRef: string): Promise<RelayPoint[]> {
  const race = await resolveRace(raceRef);
  const { data, error } = await supabase
    .from("relay_points")
    .select("id, race_id, sequence_index, name")
    .eq("race_id", race.id)
    .order("sequence_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRelayPoint);
}

export async function createTeam(input: { raceId: string; name: string; members: string[] }): Promise<Team> {
  await requireAdminAccess();
  const payload = createTeamSchema.parse(input);
  const race = await resolveRace(payload.raceId);
  if (race.status !== "planned") throw new Error("Teams cannot be added after race start.");
  const { data, error } = await supabase
    .from("teams")
    .insert([{ race_id: race.id, name: payload.name.trim(), members: payload.members }])
    .select("id, race_id, name, members, created_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create team.");
  return toTeam({ ...data, members: (data.members as string[]) ?? [] });
}

export async function getRelayEventsByRace(raceRef: string): Promise<RelayEvent[]> {
  const race = await resolveRace(raceRef);
  const { data, error } = await supabase
    .from("relay_events")
    .select(
      "id, race_id, team_id, relay_point_id, recorded_at, recorded_by, source, supersedes_event_id, correction_reason, invalidated_by_event_id"
      + ", effective_recorded_at"
    )
    .eq("race_id", race.id)
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RelayEventRow[]).map(toRelayEvent);
}

export async function markRelayPass(input: { raceId: string; teamId: string; relayPointId: string; recordedBy: string }): Promise<RelayEvent> {
  const payload = relayPassSchema.parse(input);
  const race = await resolveRace(payload.raceId);
  if (race.status !== "active") throw new Error("Race is not active.");
  const duplicate = await supabase
    .from("relay_events")
    .select(
      "id, race_id, team_id, relay_point_id, recorded_at, recorded_by, source, supersedes_event_id, correction_reason, invalidated_by_event_id"
      + ", effective_recorded_at"
    )
    .eq("race_id", race.id)
    .eq("team_id", payload.teamId)
    .eq("relay_point_id", payload.relayPointId)
    .eq("source", "marshal_tap")
    .is("invalidated_by_event_id", null)
    .limit(1)
    .maybeSingle();
  if (duplicate.error) throw new Error(duplicate.error.message);
  if (duplicate.data) return toRelayEvent(asRelayEventRow(duplicate.data));
  const insertResponse = await supabase
    .from("relay_events")
    .insert([
      {
        race_id: race.id,
        team_id: payload.teamId,
        relay_point_id: payload.relayPointId,
        recorded_by: payload.recordedBy,
        source: "marshal_tap",
        supersedes_event_id: null,
        correction_reason: null,
        invalidated_by_event_id: null,
      },
    ])
    .select(
      "id, race_id, team_id, relay_point_id, recorded_at, recorded_by, source, supersedes_event_id, correction_reason, invalidated_by_event_id"
      + ", effective_recorded_at"
    )
    .single();
  if (insertResponse.error) {
    if (insertResponse.error.code === "23505" && insertResponse.error.message.includes("uniq_valid_relay_pass")) {
      const existingResponse = await supabase
        .from("relay_events")
        .select(
          "id, race_id, team_id, relay_point_id, recorded_at, recorded_by, source, supersedes_event_id, correction_reason, invalidated_by_event_id"
          + ", effective_recorded_at"
        )
        .eq("race_id", race.id)
        .eq("team_id", payload.teamId)
        .eq("relay_point_id", payload.relayPointId)
        .eq("source", "marshal_tap")
        .is("invalidated_by_event_id", null)
        .limit(1)
        .single();
      if (!existingResponse.error && existingResponse.data) {
        return toRelayEvent(asRelayEventRow(existingResponse.data));
      }
    }
    throw new Error(insertResponse.error.message);
  }
  if (!insertResponse.data) throw new Error("Failed to record relay pass.");
  return toRelayEvent(asRelayEventRow(insertResponse.data));
}

export async function addCorrection(input: {
  raceId: string;
  supersedesEventId: string;
  recordedBy: string;
  reason: string;
  effectiveRecordedAt?: string;
}): Promise<RelayEvent> {
  const payload = correctionSchema.parse(input);
  const created = await createCorrectionRequest({
    raceId: payload.raceId,
    supersedesEventId: payload.supersedesEventId,
    reason: payload.reason,
    effectiveRecordedAt: payload.effectiveRecordedAt ?? new Date().toISOString(),
    idempotencyKey: `legacy-${crypto.randomUUID()}`,
  });
  const applied = await applyCorrectionRequest(created.id);
  if (!applied.appliedEventId) {
    throw new Error("Correction request was not applied.");
  }
  const events = await getRelayEventsByRace(payload.raceId);
  const matched = events.find((event) => event.id === applied.appliedEventId);
  if (!matched) throw new Error("Applied correction event not found.");
  return matched;
}

export async function getLeaderboard(raceRef: string): Promise<LeaderboardRow[]> {
  const race = await resolveRace(raceRef);
  const [teams, relayPoints, relayEvents] = await Promise.all([
    getTeamsByRace(race.id),
    getRelayPointsByRace(race.id),
    getRelayEventsByRace(race.id),
  ]);
  return computeLeaderboard({ race, teams, relayPoints, relayEvents });
}

export async function getPendingSignupRequests(): Promise<SignupRequest[]> {
  await requireAdminAccess();
  const { data, error } = await supabase
    .from("team_signup_pending_review")
    .select("id, team_name, captain_discord, teammates_discord, contact_email, notes, status, source, submitted_at")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSignupRequest);
}

export async function approveSignupToRace(input: {
  signupId: string;
  raceId: string;
  approvedBy: string;
}): Promise<Team> {
  const adminEmail = await requireAdminAccess();
  const signupId = input.signupId.trim();
  if (!signupId) throw new Error("Signup ID is required.");
  const approvedBy = input.approvedBy.trim().toLowerCase();
  if (!approvedBy) throw new Error("Approver identity is required.");
  if (approvedBy !== adminEmail.toLowerCase()) throw new Error("Approver does not match signed-in admin.");
  const race = await resolveRace(input.raceId);
  if (race.status !== "planned") throw new Error("Teams cannot be added after race start.");
  const signupResponse = await supabase
    .from("team_signup_requests")
    .select("id, team_name, captain_discord, teammates_discord, contact_email, notes, status, source, submitted_at")
    .eq("id", signupId)
    .single();
  if (signupResponse.error || !signupResponse.data) throw new Error(signupResponse.error?.message ?? "Signup request not found.");
  const signup = toSignupRequest(signupResponse.data);
  if (signup.status !== "pending") throw new Error("Signup request is no longer pending.");
  const members = signupMembersFromDiscord(signup);
  const teamResponse = await supabase
    .from("teams")
    .insert([{ race_id: race.id, name: signup.teamName.trim(), members }])
    .select("id, race_id, name, members, created_at")
    .single();
  if (teamResponse.error || !teamResponse.data) throw new Error(teamResponse.error?.message ?? "Failed to create team from signup.");
  const statusResponse = await supabase
    .from("team_signup_requests")
    .update({ status: "approved", notes: signup.notes })
    .eq("id", signup.id)
    .eq("status", "pending")
    .select("id")
    .single();
  if (statusResponse.error || !statusResponse.data) {
    throw new Error(statusResponse.error?.message ?? "Failed to mark signup as approved.");
  }
  return toTeam({ ...teamResponse.data, members: (teamResponse.data.members as string[]) ?? [] });
}

export async function rejectSignupRequest(input: {
  signupId: string;
  reason: string;
  approvedBy: string;
}): Promise<SignupRequest> {
  const adminEmail = await requireAdminAccess();
  const signupId = input.signupId.trim();
  if (!signupId) throw new Error("Signup ID is required.");
  const approvedBy = input.approvedBy.trim().toLowerCase();
  if (!approvedBy) throw new Error("Approver identity is required.");
  if (approvedBy !== adminEmail.toLowerCase()) throw new Error("Approver does not match signed-in admin.");
  const reason = input.reason.trim();
  if (!reason) throw new Error("Rejection reason is required.");
  const { data, error } = await supabase
    .from("team_signup_requests")
    .update({ status: "rejected", notes: reason })
    .eq("id", signupId)
    .eq("status", "pending")
    .select("id, team_name, captain_discord, teammates_discord, contact_email, notes, status, source, submitted_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to reject signup request.");
  return toSignupRequest(data);
}

export async function getCorrectionRequestsByRace(raceRef: string): Promise<CorrectionRequest[]> {
  const race = await resolveRace(raceRef);
  const { data, error } = await supabase
    .from("correction_requests")
    .select(
      "id, race_id, supersedes_event_id, requested_by, reason, status, submitted_at, effective_recorded_at, reviewed_by, reviewed_at, review_notes, applied_event_id, idempotency_key"
    )
    .eq("race_id", race.id)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCorrectionRequest);
}

export async function createCorrectionRequest(input: {
  raceId: string;
  supersedesEventId: string;
  reason: string;
  effectiveRecordedAt: string;
  idempotencyKey: string;
}): Promise<CorrectionRequest> {
  const adminEmail = await requireAdminAccess();
  const payload = createCorrectionRequestSchema.parse({
    ...input,
    requestedBy: adminEmail,
  });
  return invokeAdminCorrections<CorrectionRequest>({
    ...payload,
    requestedBy: adminEmail,
    action: "create",
  });
}

export async function applyCorrectionRequest(requestId: string): Promise<CorrectionRequest> {
  const adminEmail = await requireAdminAccess();
  return invokeAdminCorrections<CorrectionRequest>({
    action: "review",
    requestId,
    reviewedBy: adminEmail,
    reviewAction: "approve",
  });
}

export async function rejectCorrectionRequest(requestId: string, reviewNotes: string): Promise<CorrectionRequest> {
  const adminEmail = await requireAdminAccess();
  return invokeAdminCorrections<CorrectionRequest>({
    action: "review",
    requestId,
    reviewedBy: adminEmail,
    reviewAction: "reject",
    reviewNotes,
  });
}

export async function getIncidentNotesByRace(raceRef: string): Promise<RaceIncidentNote[]> {
  const race = await resolveRace(raceRef);
  const { data, error } = await supabase
    .from("race_incident_notes")
    .select("id, race_id, note, created_by, created_by_name, created_at")
    .eq("race_id", race.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRaceIncidentNote);
}

export async function createIncidentNote(input: { raceId: string; note: string }): Promise<RaceIncidentNote> {
  const adminEmail = await requireAdminAccess();
  const adminIdentity = await getCurrentAdminIdentity();
  const createdByName = adminIdentity?.displayName ?? adminEmail;
  const payload = raceIncidentNoteSchema.parse({
    ...input,
    createdBy: adminEmail,
  });
  const race = await resolveRace(payload.raceId);
  const { data, error } = await supabase
    .from("race_incident_notes")
    .insert([{ race_id: race.id, note: payload.note, created_by: adminEmail, created_by_name: createdByName }])
    .select("id, race_id, note, created_by, created_by_name, created_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create incident note.");
  return toRaceIncidentNote(data);
}

export async function postDiscordRelayUpdate(payload: {
  raceCode: string;
  teamId: string;
  relayPointId: string;
  recordedAt: string;
}): Promise<void> {
  const proxyUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.NEXT_PUBLIC_DISCORD_PROXY_URL;
  if (!proxyUrl) return;

  try {
    await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Relay pass: race=${payload.raceCode} team=${payload.teamId} point=${payload.relayPointId} at=${payload.recordedAt}`,
      }),
    });
  } catch {
    // Discord notifications must not block race control.
  }
}
