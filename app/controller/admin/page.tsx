"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approveSignupToRace,
  bulkModerateSignupRequests,
  applyCorrectionRequest,
  completeRace as completeRaceRecord,
  createIncidentNote as createIncidentNoteRecord,
  createCorrectionRequest,
  createRace as createRaceRecord,
  createTeam as createTeamRecord,
  getIncidentNotesByRace,
  getCorrectionRequestsByRace,
  getPendingSignupRequests,
  getRaceEvidenceBundle,
  getRaces,
  getRelayEventsByRace,
  getRelayPointsByRace,
  markSignupAsSpam,
  rejectSignupRequest,
  rejectCorrectionRequest,
  getTeamsByRace,
  startRace as startRaceRecord,
  updateRaceStatusDetails
} from "@/lib/controller/race-service";
import { AdminIdentity, getCurrentAdminIdentity, isAllowedAdmin, updateCurrentAdminDisplayName } from "@/lib/controller/admin-auth";
import { getSignedInLabel } from "@/lib/controller/admin-display";
import { formatDateTime } from "@/lib/controller/datetime";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import { correctionsToCsv, incidentsToCsv, leaderboardToCsv, relayEventsToCsv } from "@/lib/controller/evidence-export";
import { downloadTextFile } from "@/lib/controller/download";
import { CorrectionRequest, Race, RaceIncidentNote, RelayEvent, RelayPoint, SignupRequest, Team } from "@/lib/controller/types";

function getMetadataName(metadata: Record<string, unknown> | undefined): string | null {
  const raceDirectorName = metadata?.race_director_name;
  if (typeof raceDirectorName === "string" && raceDirectorName.trim()) return raceDirectorName.trim();
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const name = metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return null;
}

export default function AdminPage() {
  const supabase = getSupabaseBrowser();
  const [authIdentity, setAuthIdentity] = useState<AdminIdentity | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [signInEmail, setSignInEmail] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [raceName, setRaceName] = useState("Celestial Relay Alpha");
  const [relayPointsText, setRelayPointsText] = useState("Start\nOrbital Ring\nOutpost\nFinish");
  const [raceRef, setRaceRef] = useState("");
  const [teamName, setTeamName] = useState("");
  const [membersText, setMembersText] = useState("");
  const [supersededEventId, setSupersededEventId] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [effectiveRecordedAt, setEffectiveRecordedAt] = useState("");
  const [incidentNoteText, setIncidentNoteText] = useState("");
  const [statusNoteInput, setStatusNoteInput] = useState("");
  const [weatherNoteInput, setWeatherNoteInput] = useState("");
  const [liveOverrideInput, setLiveOverrideInput] = useState<"auto" | "live" | "not_live">("auto");
  const [nextStatusEtaInput, setNextStatusEtaInput] = useState("");
  const [nextStatusEtaNoteInput, setNextStatusEtaNoteInput] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | CorrectionRequest["status"]>("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "name">("newest");
  const [autoRefreshLiveOps, setAutoRefreshLiveOps] = useState(false);
  const [liveOpsNowMs, setLiveOpsNowMs] = useState(0);
  const [races, setRaces] = useState<Race[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [events, setEvents] = useState<RelayEvent[]>([]);
  const [incidentNotes, setIncidentNotes] = useState<RaceIncidentNote[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [pendingSignups, setPendingSignups] = useState<SignupRequest[]>([]);
  const [signupRaceSelections, setSignupRaceSelections] = useState<Record<string, string>>({});
  const [signupActionLoadingId, setSignupActionLoadingId] = useState<string | null>(null);
  const [selectedSignupIds, setSelectedSignupIds] = useState<string[]>([]);
  const [status, setStatus] = useState(
    supabase
      ? "Ready"
      : "Admin console is not configured on this deployment (missing Supabase environment variables)."
  );
  const currentPageUrl =
    typeof globalThis.location === "undefined"
      ? ""
      : `${globalThis.location.origin}${globalThis.location.pathname}`;

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;
    async function updateAccess(email: string | null) {
      const allowed = email ? await isAllowedAdmin(email) : false;
      if (!isMounted) return;
      setAccessAllowed(allowed);
      setAuthLoading(false);
    }

    async function loadAuthState() {
      try {
        const identity = await getCurrentAdminIdentity();
        const email = identity?.email ?? null;
        if (!isMounted) return;
        setAuthIdentity(identity);
        setProfileDisplayName(identity?.displayName ?? "");
        await updateAccess(email);
      } catch (error) {
        console.error("Failed to load admin auth state", error);
        if (!isMounted) return;
        setAuthLoading(false);
        setStatus("Unable to initialize admin auth.");
      }
    }

    void loadAuthState();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextEmail = session?.user?.email?.trim().toLowerCase() ?? null;
      const metadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
      const fallbackName = getMetadataName(metadata);
      const nextIdentity = nextEmail ? { email: nextEmail, displayName: fallbackName ?? nextEmail } : null;
      setAuthIdentity(nextIdentity);
      setProfileDisplayName(nextIdentity?.displayName ?? "");
      void updateAccess(nextEmail);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function sendMagicLink(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!supabase) {
      setStatus("Admin auth is unavailable on this deployment.");
      return;
    }
    if (!signInEmail.trim()) {
      setStatus("Enter an email to sign in.");
      return;
    }
    const redirectTo = currentPageUrl || "/";
    const { error } = await supabase.auth.signInWithOtp({
      email: signInEmail.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo }
    });
    if (error) {
      console.error("Failed to send admin magic link", error);
      setStatus("Unable to send magic link.");
      return;
    }
    setStatus(`Magic link sent. Complete sign in and return to ${redirectTo}.`);
  }

  async function signOut() {
    if (!supabase) {
      setStatus("Admin auth is unavailable on this deployment.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Failed to sign out admin", error);
      setStatus("Unable to sign out.");
      return;
    }
    setStatus("Signed out.");
  }

  async function saveDisplayName(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!authIdentity?.email) {
      setStatus("Sign in required.");
      return;
    }
    const nextDisplayName = profileDisplayName.trim();
    if (!nextDisplayName) {
      setStatus("Display name is required.");
      return;
    }
    try {
      setProfileSaving(true);
      const updated = await updateCurrentAdminDisplayName(nextDisplayName);
      setAuthIdentity(updated);
      setStatus("Profile updated.");
    } catch (error) {
      console.error("Failed to update admin profile", error);
      setStatus("Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function refreshRaces() {
    try {
      const [nextRaces, nextSignups] = await Promise.all([getRaces(), getPendingSignupRequests()]);
      setRaces(nextRaces);
      setPendingSignups(nextSignups);
    } catch (error) {
      console.error("Unable to load races or signup queue", error);
      setStatus("Unable to load races or signup queue.");
      return;
    }
  }

  async function refreshRaceContext(reference: string) {
    if (!reference) return;
    try {
      const [nextTeams, nextRelayPoints, nextEvents, nextRequests, nextIncidentNotes] = await Promise.all([
        getTeamsByRace(reference),
        getRelayPointsByRace(reference),
        getRelayEventsByRace(reference),
        getCorrectionRequestsByRace(reference),
        getIncidentNotesByRace(reference)
      ]);
      setTeams(nextTeams);
      setRelayPoints(nextRelayPoints);
      setEvents(nextEvents);
      setCorrectionRequests(nextRequests);
      setIncidentNotes(nextIncidentNotes);
      setLiveOpsNowMs(Date.now());
    } catch (error) {
      console.error("Failed to load race context", error);
      setStatus("Failed to load race context.");
    }
  }

  const selectedRace = useMemo(
    () => races.find((race) => race.code === raceRef || race.id === raceRef) ?? null,
    [raceRef, races]
  );

  function hydratePublicStatusFields(race: Race | null) {
    setStatusNoteInput(race?.statusNote ?? "");
    setWeatherNoteInput(race?.weatherNote ?? "");
    if (race?.isLiveOverride === true) setLiveOverrideInput("live");
    else if (race?.isLiveOverride === false) setLiveOverrideInput("not_live");
    else setLiveOverrideInput("auto");
    setNextStatusEtaInput(race?.nextStatusEta ?? "");
    setNextStatusEtaNoteInput(race?.nextStatusEtaNote ?? "");
  }

  const visibleRaces = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    const filtered = races.filter((race) => {
      if (!lowered) return true;
      return race.name.toLowerCase().includes(lowered) || race.code.toLowerCase().includes(lowered);
    });
    if (sortOrder === "name") {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered.sort((a, b) => b.id.localeCompare(a.id));
  }, [races, search, sortOrder]);

  const eventTeamMap = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const eventRelayPointMap = useMemo(() => new Map(relayPoints.map((point) => [point.id, point.name])), [relayPoints]);
  const correctionTarget = useMemo(
    () => events.find((eventItem) => eventItem.id === supersededEventId) ?? null,
    [events, supersededEventId]
  );
  const visibleRequests = useMemo(() => {
    return correctionRequests.filter((requestItem) => queueStatusFilter === "all" || requestItem.status === queueStatusFilter);
  }, [correctionRequests, queueStatusFilter]);
  const recentEventCount = useMemo(() => {
    if (liveOpsNowMs === 0) return 0;
    const fiveMinutesAgo = liveOpsNowMs - 5 * 60 * 1000;
    return events.filter((eventItem) => Date.parse(eventItem.recordedAt) >= fiveMinutesAgo).length;
  }, [events, liveOpsNowMs]);
  const pendingRequestCount = useMemo(
    () => correctionRequests.filter((requestItem) => requestItem.status === "pending").length,
    [correctionRequests]
  );

  useEffect(() => {
    if (!autoRefreshLiveOps || !raceRef || selectedRace?.status !== "active") return;
    const handle = globalThis.setInterval(() => {
      void refreshRaceContext(raceRef);
    }, 10000);
    return () => globalThis.clearInterval(handle);
  }, [autoRefreshLiveOps, raceRef, selectedRace?.status]);

  useEffect(() => {
    if (!supabase || !selectedRace?.id) return;
    const channel = supabase
      .channel(`admin-live:${selectedRace.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "relay_events", filter: `race_id=eq.${selectedRace.id}` }, () => {
        void refreshRaceContext(selectedRace.code);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "correction_requests", filter: `race_id=eq.${selectedRace.id}` }, () => {
        void refreshRaceContext(selectedRace.code);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "race_incident_notes", filter: `race_id=eq.${selectedRace.id}` }, () => {
        void refreshRaceContext(selectedRace.code);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_signup_requests" }, () => {
        void refreshRaces();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedRace?.id, selectedRace?.code, supabase]);

  async function handleCreateRace(event: { preventDefault: () => void }) {
    event.preventDefault();
    try {
      const relayPoints = relayPointsText.split("\n").map((point) => point.trim()).filter(Boolean);
      const race = await createRaceRecord({ name: raceName, relayPoints });
      setRaceRef(race.code);
      hydratePublicStatusFields(race);
      await refreshRaces();
      await refreshRaceContext(race.code);
      setStatus(`Race created: ${race.name} (${race.code})`);
    } catch (error) {
      console.error("Failed to create race", error);
      setStatus("Failed to create race.");
      return;
    }
  }

  async function handleCreateTeam(event: { preventDefault: () => void }) {
    event.preventDefault();
    try {
      const members = membersText.split(",").map((member) => member.trim()).filter(Boolean);
      const team = await createTeamRecord({ raceId: raceRef, name: teamName, members });
      setTeamName("");
      setMembersText("");
      await refreshRaceContext(raceRef);
      setStatus(`Team registered: ${team.name}`);
    } catch (error) {
      console.error("Failed to create team", error);
      setStatus("Team create failed.");
    }
  }

  async function startRace() {
    if (!selectedRace) return;
    const confirmed = globalThis.confirm(`Start race "${selectedRace.name}" (${selectedRace.code}) now?`);
    if (!confirmed) return;
    try {
      const race = await startRaceRecord(raceRef);
      await refreshRaces();
      await refreshRaceContext(raceRef);
      setStatus(`Race active at ${formatDateTime(race.startedAt)}`);
    } catch (error) {
      console.error("Failed to start race", error);
      setStatus("Start failed.");
    }
  }

  async function completeRace() {
    if (!selectedRace) return;
    const confirmed = globalThis.confirm(`Complete race "${selectedRace.name}" (${selectedRace.code}) now?`);
    if (!confirmed) return;
    try {
      const race = await completeRaceRecord(raceRef);
      await refreshRaces();
      await refreshRaceContext(raceRef);
      setStatus(`Race completed at ${formatDateTime(race.endedAt)}`);
    } catch (error) {
      console.error("Failed to complete race", error);
      setStatus("Completion failed.");
    }
  }

  async function saveRaceStatusDetails(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!selectedRace) {
      setStatus("Select a race first.");
      return;
    }
    try {
      const updated = await updateRaceStatusDetails({
        raceId: selectedRace.id,
        statusNote: statusNoteInput.trim() || null,
        weatherNote: weatherNoteInput.trim() || null,
        isLiveOverride: liveOverrideInput === "auto" ? null : liveOverrideInput === "live",
        nextStatusEta: nextStatusEtaInput.trim() ? new Date(nextStatusEtaInput).toISOString() : null,
        nextStatusEtaNote: nextStatusEtaNoteInput.trim() || null,
      });
      setStatusNoteInput(updated.statusNote ?? "");
      setWeatherNoteInput(updated.weatherNote ?? "");
      if (updated.isLiveOverride === true) setLiveOverrideInput("live");
      else if (updated.isLiveOverride === false) setLiveOverrideInput("not_live");
      else setLiveOverrideInput("auto");
      setNextStatusEtaInput(updated.nextStatusEta ?? "");
      setNextStatusEtaNoteInput(updated.nextStatusEtaNote ?? "");
      await refreshRaces();
      setStatus(`Public status updated for ${updated.code}.`);
    } catch (error) {
      console.error("Failed to save race status details", error);
      setStatus("Failed to update public race status.");
    }
  }

  async function submitCorrectionRequest(event: { preventDefault: () => void }) {
    event.preventDefault();
    const confirmed = globalThis.confirm("Submit correction request to triage queue?");
    if (!confirmed) return;
    if (!correctionTarget) return;
    const effectiveAt = effectiveRecordedAt || correctionTarget.recordedAt;
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      const request = await createCorrectionRequest({
        raceId: raceRef,
        supersedesEventId: supersededEventId,
        reason: correctionReason,
        effectiveRecordedAt: new Date(effectiveAt).toISOString(),
        idempotencyKey: crypto.randomUUID()
      });
      setSupersededEventId("");
      setCorrectionReason("");
      setEffectiveRecordedAt("");
      await refreshRaceContext(raceRef);
      setStatus(`Correction queued: ${request.id}`);
    } catch (error) {
      console.error("Failed to submit correction request", error);
      setStatus("Correction request failed.");
    }
  }

  function selectCorrectionTarget(eventId: string) {
    setSupersededEventId(eventId);
    setStatus("Correction target selected.");
  }

  function formatEventSource(source: RelayEvent["source"]): string {
    return source === "admin_correction" ? "Admin correction" : "Marshal pass";
  }

  async function approveRequest(requestId: string) {
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      await applyCorrectionRequest(requestId);
      await refreshRaceContext(raceRef);
      setStatus(`Correction applied: ${requestId}`);
    } catch (error) {
      console.error("Failed to apply correction request", error);
      setStatus("Apply failed.");
    }
  }

  async function rejectRequest(requestId: string) {
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      await rejectCorrectionRequest(requestId, "Rejected during triage review.");
      await refreshRaceContext(raceRef);
      setStatus(`Correction rejected: ${requestId}`);
    } catch (error) {
      console.error("Failed to reject correction request", error);
      setStatus("Reject failed.");
    }
  }

  function setSignupRace(signupId: string, value: string) {
    setSignupRaceSelections((previous) => ({ ...previous, [signupId]: value }));
  }

  function toggleSignupSelection(signupId: string, checked: boolean) {
    setSelectedSignupIds((previous) => {
      if (checked) {
        return previous.includes(signupId) ? previous : [...previous, signupId];
      }
      return previous.filter((id) => id !== signupId);
    });
  }

  async function approveSignup(signup: SignupRequest) {
    const selectedSignupRace = signupRaceSelections[signup.id]?.trim() || raceRef.trim();
    if (!selectedSignupRace) {
      setStatus("Select a race before approving signup.");
      return;
    }
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      setSignupActionLoadingId(signup.id);
      const team = await approveSignupToRace({
        signupId: signup.id,
        raceId: selectedSignupRace,
        approvedBy: authIdentity.email
      });
      await refreshRaces();
      if (raceRef) {
        await refreshRaceContext(raceRef);
      }
      if (selectedRace && (selectedRace.id === team.raceId || selectedRace.code === selectedSignupRace)) {
        await refreshRaceContext(selectedRace.code);
      }
      setStatus(`Signup approved: ${signup.teamName} added as ${team.name}`);
    } catch (error) {
      console.error("Failed to approve signup request", error);
      setStatus(error instanceof Error ? error.message : "Signup approval failed.");
    } finally {
      setSignupActionLoadingId(null);
    }
  }

  async function rejectSignup(signup: SignupRequest) {
    const reason = globalThis.prompt("Reason for rejection", "Duplicate or invalid signup.");
    if (reason === null) return;
    if (!reason.trim()) {
      setStatus("Rejection reason is required.");
      return;
    }
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      setSignupActionLoadingId(signup.id);
      await rejectSignupRequest({
        signupId: signup.id,
        reason,
        approvedBy: authIdentity.email
      });
      await refreshRaces();
      setStatus(`Signup rejected: ${signup.teamName}`);
    } catch (error) {
      console.error("Failed to reject signup request", error);
      setStatus(error instanceof Error ? error.message : "Signup rejection failed.");
    } finally {
      setSignupActionLoadingId(null);
    }
  }

  async function markSignupSpam(signup: SignupRequest) {
    const reason = globalThis.prompt("Reason for spam", "Spam or abuse.");
    if (reason === null || !reason.trim()) return;
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      setSignupActionLoadingId(signup.id);
      await markSignupAsSpam({
        signupId: signup.id,
        reason,
        approvedBy: authIdentity.email,
      });
      await refreshRaces();
      setStatus(`Signup marked as spam: ${signup.teamName}`);
    } catch (error) {
      console.error("Failed to mark signup as spam", error);
      setStatus(error instanceof Error ? error.message : "Spam action failed.");
    } finally {
      setSignupActionLoadingId(null);
    }
  }

  async function runBulkSignupModeration(action: "reject" | "spam") {
    if (selectedSignupIds.length === 0) {
      setStatus("Select at least one signup for bulk moderation.");
      return;
    }
    const reason = globalThis.prompt(`Reason for bulk ${action}`, action === "spam" ? "Spam or abuse." : "Invalid or duplicate signup.");
    if (reason === null || !reason.trim()) return;
    try {
      if (!authIdentity?.email) throw new Error("Sign in required.");
      await bulkModerateSignupRequests({
        signupIds: selectedSignupIds,
        action,
        reason,
        approvedBy: authIdentity.email,
      });
      setSelectedSignupIds([]);
      await refreshRaces();
      setStatus(`Bulk ${action} complete for ${selectedSignupIds.length} signup(s).`);
    } catch (error) {
      console.error("Bulk signup moderation failed", error);
      setStatus(error instanceof Error ? error.message : "Bulk moderation failed.");
    }
  }

  async function exportEvidence(format: "json" | "csv") {
    if (!raceRef.trim()) {
      setStatus("Select a race before exporting evidence.");
      return;
    }
    try {
      const bundle = await getRaceEvidenceBundle(raceRef);
      if (format === "json") {
        downloadTextFile(
          `${bundle.race.code}-evidence.json`,
          JSON.stringify(bundle, null, 2)
        );
      } else {
        const csvSections = [
          ["relay_events.csv", relayEventsToCsv(bundle.relayEvents)],
          ["corrections.csv", correctionsToCsv(bundle.correctionRequests)],
          ["incidents.csv", incidentsToCsv(bundle.incidentNotes)],
          ["leaderboard.csv", leaderboardToCsv(bundle.leaderboard)],
        ] as const;
        downloadTextFile(
          `${bundle.race.code}-evidence.txt`,
          csvSections.map(([name, content]) => `## ${name}\n${content}`).join("\n")
        );
      }
      setStatus(`Evidence export generated for ${bundle.race.code}.`);
    } catch (error) {
      console.error("Failed to export evidence", error);
      setStatus("Evidence export failed.");
    }
  }

  async function submitIncidentNote(event: { preventDefault: () => void }) {
    event.preventDefault();
    try {
      if (!raceRef) throw new Error("Select a race first.");
      const note = await createIncidentNoteRecord({ raceId: raceRef, note: incidentNoteText });
      setIncidentNoteText("");
      await refreshRaceContext(raceRef);
      setStatus(`Incident note logged: ${note.id.slice(0, 8)}`);
    } catch (error) {
      console.error("Failed to save incident note", error);
      setStatus("Failed to save incident note.");
    }
  }

  const signedInLabel = getSignedInLabel(authIdentity);

  return (
    <main className="admin-main">
      <h1>Admin Console</h1>
      <p>Use this page for setup, race operations, and correction audits.</p>
      <section className="card admin-card">
        <h2>Admin Access</h2>
        {authLoading ? (
          <p>Checking session...</p>
        ) : authIdentity ? (
          <>
            <p>Signed in as {signedInLabel}</p>
            <form className="admin-form" onSubmit={saveDisplayName}>
              <label htmlFor="displayName">Race director name</label>
              <input
                id="displayName"
                value={profileDisplayName}
                onChange={(eventItem) => setProfileDisplayName(eventItem.target.value)}
                placeholder="Race Director Alex"
              />
              <button type="submit" className="secondary" disabled={profileSaving || !profileDisplayName.trim()}>
                {profileSaving ? "Saving..." : "Save name"}
              </button>
            </form>
            <button type="button" className="secondary" onClick={() => void signOut()}>
              Sign out
            </button>
            {!accessAllowed ? (
              <p>
                Access denied. Add this email to <code>NEXT_PUBLIC_ADMIN_EMAILS</code> to unlock admin controls.
              </p>
            ) : null}
          </>
        ) : (
          <form className="admin-form" onSubmit={sendMagicLink}>
            <label htmlFor="adminSignInEmail">Admin email</label>
            <input
              id="adminSignInEmail"
              type="email"
              value={signInEmail}
              onChange={(eventItem) => setSignInEmail(eventItem.target.value)}
              placeholder="admin@example.com"
            />
            <button type="submit">Send magic link</button>
            <p>
              If you keep returning to this form, ensure Supabase Auth URL settings allow
              <code>{` ${currentPageUrl || "/"}`}</code>.
            </p>
          </form>
        )}
      </section>

      {!authLoading && !accessAllowed ? <p>{status}</p> : null}
      {accessAllowed ? (
        <>

      <section className="card admin-card">
        <h2>Race Finder</h2>
        <button type="button" onClick={() => void refreshRaces()}>
          Refresh races
        </button>
        <label htmlFor="raceSearch">Search races</label>
        <input id="raceSearch" value={search} onChange={(eventItem) => setSearch(eventItem.target.value)} placeholder="Search by code or name" />
        <label htmlFor="raceSort">Sort by</label>
        <select id="raceSort" value={sortOrder} onChange={(eventItem) => setSortOrder(eventItem.target.value as "newest" | "name")}>
          <option value="newest">Newest first</option>
          <option value="name">Name A-Z</option>
        </select>
        <div className="grid">
          {visibleRaces.map((race) => (
            <button
              type="button"
              key={race.id}
              className={raceRef === race.code ? "secondary selected" : "secondary"}
              onClick={() => {
                setRaceRef(race.code);
                hydratePublicStatusFields(race);
                void refreshRaceContext(race.code);
              }}
            >
              {race.code} - {race.name} ({race.status})
            </button>
          ))}
        </div>
      </section>

      <section className="card admin-card">
        <h2>Pending Signup Queue</h2>
        <p>Review incoming signups and assign them to a planned race.</p>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => void runBulkSignupModeration("reject")} disabled={selectedSignupIds.length === 0}>
            Bulk reject selected
          </button>
          <button type="button" className="secondary" onClick={() => void runBulkSignupModeration("spam")} disabled={selectedSignupIds.length === 0}>
            Bulk mark spam
          </button>
        </div>
        {pendingSignups.length === 0 ? (
          <p>No pending signup requests.</p>
        ) : (
          <ul className="admin-list">
            {pendingSignups.map((signup) => {
              const selectedSignupRace = signupRaceSelections[signup.id] ?? raceRef;
              const isBusy = signupActionLoadingId === signup.id;
              return (
                <li key={signup.id} className="admin-list-item">
                  <label htmlFor={`signup-select-${signup.id}`} className="admin-meta">
                    <input
                      id={`signup-select-${signup.id}`}
                      type="checkbox"
                      checked={selectedSignupIds.includes(signup.id)}
                      onChange={(eventItem) => toggleSignupSelection(signup.id, eventItem.target.checked)}
                    />
                    Select for bulk action
                  </label>
                  <p className="admin-meta">
                    <strong>{signup.teamName}</strong> - captain: {signup.captainDiscord}
                    {signup.contactEmail ? ` - ${signup.contactEmail}` : ""}
                  </p>
                  <p className="admin-meta">
                    Submitted {formatDateTime(signup.submittedAt)}
                    {signup.teammatesDiscord ? ` - teammates: ${signup.teammatesDiscord}` : ""}
                    {signup.notes ? ` - notes: ${signup.notes}` : ""}
                  </p>
                  <label htmlFor={`signup-race-${signup.id}`}>Assign to race</label>
                  <div className="admin-actions">
                    <select
                      id={`signup-race-${signup.id}`}
                      className="admin-inline-control"
                      value={selectedSignupRace}
                      onChange={(eventItem) => setSignupRace(signup.id, eventItem.target.value)}
                      disabled={isBusy}
                    >
                      <option value="">Select race</option>
                      {races
                        .filter((race) => race.status === "planned")
                        .map((race) => (
                          <option key={race.id} value={race.code}>
                            {race.code} - {race.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void approveSignup(signup)}
                      disabled={isBusy || !selectedSignupRace}
                    >
                      {isBusy ? "Working..." : "Approve to race"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void rejectSignup(signup)}
                      disabled={isBusy}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void markSignupSpam(signup)}
                      disabled={isBusy}
                    >
                      Mark spam
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card admin-card">
        <h2>Selected Race</h2>
        {selectedRace ? (
          <p>
            {selectedRace.name} ({selectedRace.code}) - status: {selectedRace.status} - teams: {teams.length} - relay points: {relayPoints.length}
            {selectedRace.startedAt ? ` - started: ${formatDateTime(selectedRace.startedAt)}` : ""}
            {selectedRace.endedAt ? ` - ended: ${formatDateTime(selectedRace.endedAt)}` : ""}
            {selectedRace.statusNote ? ` - public note: ${selectedRace.statusNote}` : ""}
            {selectedRace.weatherNote ? ` - weather: ${selectedRace.weatherNote}` : ""}
            {selectedRace.nextStatusEta ? ` - next ETA: ${formatDateTime(selectedRace.nextStatusEta)}` : ""}
            {selectedRace.nextStatusEtaNote ? ` (${selectedRace.nextStatusEtaNote})` : ""}
          </p>
        ) : (
          <p>Select a race from Race Finder or create a new one.</p>
        )}
        <button type="button" className="secondary" disabled={!raceRef} onClick={() => void refreshRaceContext(raceRef)}>
          Reload selected race context
        </button>
        <div className="admin-actions">
          <button type="button" className="secondary" disabled={!raceRef} onClick={() => void exportEvidence("json")}>
            Export evidence JSON
          </button>
          <button type="button" className="secondary" disabled={!raceRef} onClick={() => void exportEvidence("csv")}>
            Export evidence CSV bundle
          </button>
        </div>
      </section>

      <section className="card admin-card">
        <h2>Create Race</h2>
        <form className="admin-form" onSubmit={handleCreateRace}>
          <label htmlFor="raceName">Race name</label>
          <input id="raceName" value={raceName} onChange={(e) => setRaceName(e.target.value)} />
          <label htmlFor="relayPoints">Relay points (one per line)</label>
          <textarea id="relayPoints" value={relayPointsText} onChange={(e) => setRelayPointsText(e.target.value)} rows={5} />
          <button type="submit">Create race</button>
        </form>
      </section>

      <section className="card admin-card">
        <h2>Register Team</h2>
        <form className="admin-form" onSubmit={handleCreateTeam}>
          <label htmlFor="raceRef">Race Code</label>
          <input id="raceRef" value={raceRef} onChange={(e) => setRaceRef(e.target.value)} placeholder="solar-fox-42" />
          <label htmlFor="teamName">Team name</label>
          <input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          <label htmlFor="members">Members (comma-separated)</label>
          <input id="members" value={membersText} onChange={(e) => setMembersText(e.target.value)} />
          <button type="submit" disabled={!raceRef}>
            Register team
          </button>
        </form>
      </section>

      <section className="card admin-card">
        <h2>Race Lifecycle</h2>
        <div className="admin-actions">
          <button type="button" onClick={startRace} disabled={!raceRef || selectedRace?.status !== "planned"}>
            Start race
          </button>
          <button type="button" className="secondary" onClick={completeRace} disabled={!raceRef || selectedRace?.status !== "active"}>
            Complete race
          </button>
        </div>
      </section>

      <section className="card admin-card">
        <h2>Public Race Status Controls</h2>
        <form className="admin-form" onSubmit={saveRaceStatusDetails}>
          <label htmlFor="statusNoteInput">Public status note</label>
          <input
            id="statusNoteInput"
            value={statusNoteInput}
            onChange={(eventItem) => setStatusNoteInput(eventItem.target.value)}
            placeholder="Grid open. Race starts in 20 minutes."
          />
          <label htmlFor="weatherNoteInput">Weather note</label>
          <input
            id="weatherNoteInput"
            value={weatherNoteInput}
            onChange={(eventItem) => setWeatherNoteInput(eventItem.target.value)}
            placeholder="Clear skies, light wind."
          />
          <label htmlFor="liveOverrideInput">Live override</label>
          <select
            id="liveOverrideInput"
            value={liveOverrideInput}
            onChange={(eventItem) => setLiveOverrideInput(eventItem.target.value as "auto" | "live" | "not_live")}
          >
            <option value="auto">Auto (use race lifecycle)</option>
            <option value="live">Force live</option>
            <option value="not_live">Force not live</option>
          </select>
          <label htmlFor="nextStatusEtaInput">Next status update ETA (ISO)</label>
          <input
            id="nextStatusEtaInput"
            value={nextStatusEtaInput}
            onChange={(eventItem) => setNextStatusEtaInput(eventItem.target.value)}
            placeholder="2026-04-28T20:30:00.000Z"
          />
          <label htmlFor="nextStatusEtaNoteInput">ETA context</label>
          <input
            id="nextStatusEtaNoteInput"
            value={nextStatusEtaNoteInput}
            onChange={(eventItem) => setNextStatusEtaNoteInput(eventItem.target.value)}
            placeholder="Next marshal update and pitlane readiness."
          />
          <button type="submit" disabled={!selectedRace}>
            Save public status
          </button>
        </form>
      </section>

      <section className="card admin-card">
        <h2>Live Ops</h2>
        {!selectedRace ? (
          <p>Select a race to view operational metrics.</p>
        ) : (
          <>
            <p>Status: {selectedRace.status}</p>
            <p>Event throughput: {events.length} total, {recentEventCount} in last 5 minutes</p>
            <p>Pending corrections: {pendingRequestCount}</p>
            <div className="admin-actions">
              <button type="button" className="secondary" onClick={() => void refreshRaceContext(raceRef)} disabled={!raceRef}>
                Refresh now
              </button>
            </div>
            <label htmlFor="autoRefreshLiveOps">
              <input
                id="autoRefreshLiveOps"
                type="checkbox"
                checked={autoRefreshLiveOps}
                onChange={(eventItem) => setAutoRefreshLiveOps(eventItem.target.checked)}
              />
              Auto-refresh every 10s while race is active
            </label>
          </>
        )}
      </section>

      <section className="card admin-card">
        <h2>Correction Workspace</h2>
        <form className="admin-form" onSubmit={submitCorrectionRequest}>
          <label htmlFor="supersededEvent">Superseded event ID</label>
          <input
            id="supersededEvent"
            value={supersededEventId}
            onChange={(e) => setSupersededEventId(e.target.value)}
            placeholder="Select an event below or paste ID"
          />
          <label htmlFor="reason">Correction reason</label>
          <input id="reason" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
          <label htmlFor="effectiveAt">Effective pass time (ISO)</label>
          <input
            id="effectiveAt"
            value={effectiveRecordedAt}
            onChange={(e) => setEffectiveRecordedAt(e.target.value)}
            placeholder={correctionTarget?.recordedAt ?? "2026-04-26T13:00:00.000Z"}
          />
          {correctionTarget ? (
            <p>
              Target preview: {eventTeamMap.get(correctionTarget.teamId) ?? correctionTarget.teamId} at
              {` ${eventRelayPointMap.get(correctionTarget.relayPointId) ?? correctionTarget.relayPointId} captured ${formatDateTime(correctionTarget.recordedAt)} and currently used as ${formatDateTime(correctionTarget.effectiveRecordedAt)}`}
            </p>
          ) : (
            <p>Paste an event ID to preview target details before submitting.</p>
          )}
          <button type="submit" disabled={!raceRef || !correctionTarget}>
            Queue correction request
          </button>
        </form>
      </section>

      <section className="card admin-card">
        <h2>Triage Queue</h2>
        <label htmlFor="queueStatusFilter">Status filter</label>
        <select
          id="queueStatusFilter"
          value={queueStatusFilter}
          onChange={(eventItem) => setQueueStatusFilter(eventItem.target.value as "all" | CorrectionRequest["status"])}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="applied">Applied</option>
          <option value="rejected">Rejected</option>
          <option value="approved">Approved</option>
          <option value="failed">Failed</option>
        </select>
        {visibleRequests.length === 0 ? (
          <p>No correction requests in this filter.</p>
        ) : (
          <ul className="admin-list">
            {visibleRequests.map((requestItem) => (
              <li key={requestItem.id} className="admin-list-item">
                <p className="admin-meta">
                  {`${requestItem.status.toUpperCase()} - request ${requestItem.id.slice(0, 8)} - submitted ${formatDateTime(requestItem.submittedAt)} - effective ${formatDateTime(requestItem.effectiveRecordedAt)}`}
                </p>
                {requestItem.status === "pending" ? (
                  <div className="admin-actions">
                    <button type="button" className="secondary" onClick={() => void approveRequest(requestItem.id)}>
                      Apply
                    </button>
                    <button type="button" className="secondary" onClick={() => void rejectRequest(requestItem.id)}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card admin-card">
        <h2>Event Timeline</h2>
        <p>Select an event to auto-fill the correction target.</p>
        {events.length === 0 ? (
          <p>No events recorded yet.</p>
        ) : (
          <ul className="admin-list">
            {events.map((eventItem) => (
              <li key={eventItem.id} className="admin-list-item">
                <div className="admin-actions">
                  <button
                    type="button"
                    className={supersededEventId === eventItem.id ? "secondary selected" : "secondary"}
                    onClick={() => selectCorrectionTarget(eventItem.id)}
                  >
                    {supersededEventId === eventItem.id ? "Selected" : "Select"}
                  </button>
                </div>
                <p className="admin-meta">
                  {`${formatDateTime(eventItem.recordedAt)} - ${formatEventSource(eventItem.source)} - ${eventTeamMap.get(eventItem.teamId) ?? "Unknown team"} @ ${eventRelayPointMap.get(eventItem.relayPointId) ?? "Unknown relay point"}`}
                  {eventItem.invalidatedByEventId ? " (invalidated)" : ""}
                  {eventItem.effectiveRecordedAt === eventItem.recordedAt ? "" : ` (effective: ${formatDateTime(eventItem.effectiveRecordedAt)})`}
                  {eventItem.correctionReason ? ` (reason: ${eventItem.correctionReason})` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card admin-card">
        <h2>Race Incident Notes</h2>
        <form className="admin-form" onSubmit={submitIncidentNote}>
          <label htmlFor="incidentNote">Incident note</label>
          <textarea
            id="incidentNote"
            value={incidentNoteText}
            onChange={(eventItem) => setIncidentNoteText(eventItem.target.value)}
            rows={3}
            placeholder="Describe issue, action taken, and follow-up."
          />
          <button type="submit" disabled={!raceRef || !incidentNoteText.trim()}>
            Log incident note
          </button>
        </form>
        {incidentNotes.length === 0 ? (
          <p>No incident notes for this race.</p>
        ) : (
          <ul className="admin-list">
            {incidentNotes.map((note) => (
              <li key={note.id} className="admin-list-item">
                <p className="admin-meta">{formatDateTime(note.createdAt)} - {note.createdByName} - {note.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p>{status}</p>
        </>
      ) : null}
    </main>
  );
}
