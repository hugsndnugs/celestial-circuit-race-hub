"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserEmail, isAllowedAdmin, isAllowedMarshal } from "@/lib/controller/admin-auth";
import { formatDateTime } from "@/lib/controller/datetime";
import { getRaces, getRelayPointsByRace, getTeamsByRace, markRelayPass, postDiscordRelayUpdate } from "@/lib/controller/race-service";
import { type RelayPoint, type Team } from "@/lib/controller/types";

const QUEUE_STORAGE_KEY = "marshal-offline-queue-v2";

type OfflineQueueItem = {
  teamId: string;
  relayPointId: string;
  enqueuedAt: string;
  raceCode: string;
  raceId: string;
};

function isLikelyNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "TypeError") {
    return true;
  }
  return false;
}

function parseQueue(raw: string | null): OfflineQueueItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const teamId = typeof o.teamId === "string" ? o.teamId : "";
        const relayPointId = typeof o.relayPointId === "string" ? o.relayPointId : "";
        const enqueuedAt = typeof o.enqueuedAt === "string" ? o.enqueuedAt : "";
        const raceCode = typeof o.raceCode === "string" ? o.raceCode : "";
        const raceId = typeof o.raceId === "string" ? o.raceId : "";
        if (!teamId || !relayPointId || !enqueuedAt) return null;
        return { teamId, relayPointId, enqueuedAt, raceCode, raceId };
      })
      .filter((x): x is OfflineQueueItem => x !== null);
  } catch {
    return [];
  }
}

export default function MarshalPage() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [hasMarshalAccess, setHasMarshalAccess] = useState(false);
  const [raceRef, setRaceRef] = useState("");
  const [loadedRaceId, setLoadedRaceId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [selectedRelayPointId, setSelectedRelayPointId] = useState("");
  const [message, setMessage] = useState("Enter race code to load marshal controls.");
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    if (globalThis?.localStorage === undefined) return [];
    return parseQueue(globalThis.localStorage.getItem(QUEUE_STORAGE_KEY));
  });
  const [submittingTeamId, setSubmittingTeamId] = useState<string | null>(null);

  const offlineCount = useMemo(() => offlineQueue.length, [offlineQueue]);

  useEffect(() => {
    let isMounted = true;
    async function checkAccess() {
      try {
        const email = await getCurrentUserEmail();
        if (!isMounted) return;
        setSignedInEmail(email);
        if (!email) {
          setHasMarshalAccess(false);
          return;
        }
        const [adminAllowed, marshalAllowed] = await Promise.all([isAllowedAdmin(email), isAllowedMarshal(email)]);
        if (!isMounted) return;
        setHasMarshalAccess(adminAllowed || marshalAllowed);
      } catch {
        if (!isMounted) return;
        setHasMarshalAccess(false);
      } finally {
        if (!isMounted) return;
        setIsCheckingAccess(false);
      }
    }
    void checkAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  function persistQueue(nextQueue: OfflineQueueItem[]) {
    setOfflineQueue(nextQueue);
    if (globalThis.localStorage !== undefined) {
      globalThis.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
    }
  }

  function appendToOfflineQueue(item: OfflineQueueItem) {
    setOfflineQueue((previous) => {
      const nextQueue = [...previous, item];
      if (globalThis.localStorage !== undefined) {
        globalThis.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
      }
      return nextQueue;
    });
  }

  async function loadRaceContext() {
    if (!raceRef) return;
    try {
      const races = await getRaces();
      const raceFound = races.find((race) => race.id === raceRef || race.code === raceRef);
      if (!raceFound) {
        setMessage("Race code not found.");
        setLoadedRaceId("");
        return;
      }
      const [nextTeams, nextRelayPoints] = await Promise.all([getTeamsByRace(raceRef), getRelayPointsByRace(raceRef)]);
      setTeams(nextTeams);
      setRelayPoints(nextRelayPoints);
      setSelectedRelayPointId(nextRelayPoints[0]?.id ?? "");
      setRaceRef(raceFound.code);
      setLoadedRaceId(raceFound.id);
      setMessage("Race loaded. Tap Mark Passed per team.");
    } catch {
      setMessage("Failed to load race.");
    }
  }

  const recordedByLabel = signedInEmail ? `marshal:${signedInEmail}` : "marshal:unknown";

  async function markPassed(teamId: string) {
    if (!loadedRaceId || !selectedRelayPointId) {
      setMessage("Load a race and select a relay point first.");
      return;
    }
    setSubmittingTeamId(teamId);
    try {
      const relayEvent = await markRelayPass({
        raceId: loadedRaceId,
        teamId,
        relayPointId: selectedRelayPointId,
        recordedBy: recordedByLabel,
      });
      await postDiscordRelayUpdate({
        raceCode: raceRef,
        teamId,
        relayPointId: selectedRelayPointId,
        recordedAt: relayEvent.recordedAt,
      });
      setMessage(`Pass logged at ${formatDateTime(relayEvent.recordedAt)}`);
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        appendToOfflineQueue({
          teamId,
          relayPointId: selectedRelayPointId,
          enqueuedAt: new Date().toISOString(),
          raceCode: raceRef,
          raceId: loadedRaceId,
        });
        setMessage("Offline queue enabled: pass saved locally and will retry when you press Sync queue.");
      } else {
        setMessage(error instanceof Error ? error.message : "Could not log pass.");
      }
    } finally {
      setSubmittingTeamId(null);
    }
  }

  async function syncOfflineQueue() {
    if (offlineQueue.length === 0) {
      setMessage("No queued pass events to sync.");
      return;
    }
    const remaining: OfflineQueueItem[] = [];
    for (const queued of offlineQueue) {
      const raceId = queued.raceId || loadedRaceId;
      if (!raceId) {
        remaining.push(queued);
        continue;
      }
      try {
        const relayEvent = await markRelayPass({
          raceId,
          teamId: queued.teamId,
          relayPointId: queued.relayPointId,
          recordedBy: recordedByLabel,
        });
        await postDiscordRelayUpdate({
          raceCode: queued.raceCode || raceRef,
          teamId: queued.teamId,
          relayPointId: queued.relayPointId,
          recordedAt: relayEvent.recordedAt,
        });
      } catch {
        remaining.push(queued);
      }
    }
    persistQueue(remaining);
    setMessage(remaining.length === 0 ? "Offline queue synced." : `${remaining.length} queued passes still pending.`);
  }

  if (isCheckingAccess) {
    return (
      <main className="page-stack">
        <section className="card">
          <h1>Marshal View</h1>
          <p>Checking access...</p>
        </section>
      </main>
    );
  }

  if (!signedInEmail) {
    return (
      <main className="page-stack">
        <section className="card">
          <h1>Marshal View</h1>
          <p>You must be signed in to access marshal controls.</p>
          <p>
            <Link href="/signin">Sign in</Link>
          </p>
        </section>
      </main>
    );
  }

  if (!hasMarshalAccess) {
    return (
      <main className="page-stack">
        <section className="card">
          <h1>Marshal View</h1>
          <p>Access denied. You do not have this role.</p>
          <p>
            Signed in as {signedInEmail}. <Link href="/signin">Switch account</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Marshal View</h1>
        <p>Load a race and log relay passes from field devices.</p>
      </section>
      <section className="card section-stack">
        <label htmlFor="marshalRaceId">Race Code</label>
        <input id="marshalRaceId" value={raceRef} onChange={(e) => setRaceRef(e.target.value)} placeholder="solar-fox-42" />
        <button type="button" onClick={() => void loadRaceContext()}>
          Load race
        </button>
      </section>
      <section className="card section-stack">
        <label htmlFor="relayPoint">Relay point</label>
        <select id="relayPoint" value={selectedRelayPointId} onChange={(e) => setSelectedRelayPointId(e.target.value)}>
          {relayPoints.map((relayPoint) => (
            <option value={relayPoint.id} key={relayPoint.id}>
              {relayPoint.name}
            </option>
          ))}
        </select>
      </section>
      <section className="grid" aria-label="Team pass controls">
        {teams.map((team) => (
          <div className="card" key={team.id}>
            <h2>{team.name}</h2>
            <button
              type="button"
              onClick={() => void markPassed(team.id)}
              disabled={!selectedRelayPointId || submittingTeamId === team.id}
            >
              {submittingTeamId === team.id ? "Saving…" : "Mark Passed"}
            </button>
          </div>
        ))}
      </section>
      <section className="card">
        <p role="status" aria-live="polite">
          {message}
        </p>
        <p>Offline queue: {offlineCount}</p>
        <button type="button" className="secondary" onClick={() => void syncOfflineQueue()} disabled={offlineCount === 0}>
          Sync queue
        </button>
      </section>
    </main>
  );
}
