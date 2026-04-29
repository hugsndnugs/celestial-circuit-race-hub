"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserEmail, isAllowedAdmin, isAllowedMarshal } from "@/lib/controller/admin-auth";
import { formatDateTime } from "@/lib/controller/datetime";
import { getRaces, getRelayPointsByRace, getTeamsByRace, markRelayPass, postDiscordRelayUpdate } from "@/lib/controller/race-service";
import { type RelayPoint, type Team } from "@/lib/controller/types";

export default function MarshalPage() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [hasMarshalAccess, setHasMarshalAccess] = useState(false);
  const [raceRef, setRaceRef] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [selectedRelayPointId, setSelectedRelayPointId] = useState("");
  const [message, setMessage] = useState("Enter race code to load marshal controls.");
  const [offlineQueue, setOfflineQueue] = useState<Array<{ teamId: string; relayPointId: string; enqueuedAt: string }>>(() => {
    if (globalThis?.localStorage === undefined) return [];
    const raw = globalThis.localStorage.getItem("marshal-offline-queue");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Array<{ teamId: string; relayPointId: string; enqueuedAt: string }>;
    } catch {
      return [];
    }
  });

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

  function persistQueue(nextQueue: Array<{ teamId: string; relayPointId: string; enqueuedAt: string }>) {
    setOfflineQueue(nextQueue);
    if (globalThis.localStorage !== undefined) {
      globalThis.localStorage.setItem("marshal-offline-queue", JSON.stringify(nextQueue));
    }
  }

  async function loadRaceContext() {
    if (!raceRef) return;
    try {
      const races = await getRaces();
      const raceFound = races.find((race) => race.id === raceRef || race.code === raceRef);
      if (!raceFound) {
        setMessage("Race code not found.");
        return;
      }
      const [nextTeams, nextRelayPoints] = await Promise.all([getTeamsByRace(raceRef), getRelayPointsByRace(raceRef)]);
      setTeams(nextTeams);
      setRelayPoints(nextRelayPoints);
      setSelectedRelayPointId(nextRelayPoints[0]?.id ?? "");
      setRaceRef(raceFound.code);
      setMessage("Race loaded. Tap Mark Passed per team.");
    } catch {
      setMessage("Failed to load race.");
    }
  }

  async function markPassed(teamId: string) {
    try {
      const relayEvent = await markRelayPass({
        raceId: raceRef,
        teamId,
        relayPointId: selectedRelayPointId,
        recordedBy: "marshal:field-device-1",
      });
      await postDiscordRelayUpdate({ raceCode: raceRef, teamId, relayPointId: selectedRelayPointId, recordedAt: relayEvent.recordedAt });
      setMessage(`Pass logged at ${formatDateTime(relayEvent.recordedAt)}`);
    } catch {
      const nextQueue = [...offlineQueue, { teamId, relayPointId: selectedRelayPointId, enqueuedAt: new Date().toISOString() }];
      persistQueue(nextQueue);
      setMessage("Offline queue enabled: pass saved locally and will retry when you press Sync queue.");
    }
  }

  async function syncOfflineQueue() {
    if (offlineQueue.length === 0) {
      setMessage("No queued pass events to sync.");
      return;
    }
    const remaining: Array<{ teamId: string; relayPointId: string; enqueuedAt: string }> = [];
    for (const queued of offlineQueue) {
      try {
        const relayEvent = await markRelayPass({
          raceId: raceRef,
          teamId: queued.teamId,
          relayPointId: queued.relayPointId,
          recordedBy: "marshal:field-device-1",
        });
        await postDiscordRelayUpdate({
          raceCode: raceRef,
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
          <p>Access denied. This account is not on the marshal or admin allowlist.</p>
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
        <button type="button" onClick={loadRaceContext}>Load race</button>
      </section>
      <section className="card section-stack">
        <label htmlFor="relayPoint">Relay point</label>
        <select id="relayPoint" value={selectedRelayPointId} onChange={(e) => setSelectedRelayPointId(e.target.value)}>
          {relayPoints.map((relayPoint) => (
            <option value={relayPoint.id} key={relayPoint.id}>{relayPoint.name}</option>
          ))}
        </select>
      </section>
      <section className="grid" aria-label="Team pass controls">
        {teams.map((team) => (
          <div className="card" key={team.id}>
            <h2>{team.name}</h2>
            <button type="button" onClick={() => markPassed(team.id)} disabled={!selectedRelayPointId}>Mark Passed</button>
          </div>
        ))}
      </section>
      <section className="card">
        <p>{message}</p>
        <p>Offline queue: {offlineCount}</p>
        <button type="button" className="secondary" onClick={() => void syncOfflineQueue()} disabled={!raceRef || offlineCount === 0}>
          Sync queue
        </button>
      </section>
    </main>
  );
}
