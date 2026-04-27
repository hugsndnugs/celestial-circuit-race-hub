"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/controller/datetime";
import { getRaces, getRelayPointsByRace, getTeamsByRace, markRelayPass, postDiscordRelayUpdate } from "@/lib/controller/race-service";
import { type RelayPoint, type Team } from "@/lib/controller/types";

export default function MarshalPage() {
  const [raceRef, setRaceRef] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [selectedRelayPointId, setSelectedRelayPointId] = useState("");
  const [message, setMessage] = useState("Enter race code to load marshal controls.");

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
      setMessage("Log failed.");
    }
  }

  return (
    <main>
      <h1>Marshal View</h1>
      <div className="card">
        <label htmlFor="marshalRaceId">Race Code</label>
        <input id="marshalRaceId" value={raceRef} onChange={(e) => setRaceRef(e.target.value)} placeholder="solar-fox-42" />
        <button type="button" onClick={loadRaceContext}>Load race</button>
      </div>
      <div className="card">
        <label htmlFor="relayPoint">Relay point</label>
        <select id="relayPoint" value={selectedRelayPointId} onChange={(e) => setSelectedRelayPointId(e.target.value)}>
          {relayPoints.map((relayPoint) => (
            <option value={relayPoint.id} key={relayPoint.id}>{relayPoint.name}</option>
          ))}
        </select>
      </div>
      <div className="grid">
        {teams.map((team) => (
          <div className="card" key={team.id}>
            <h2>{team.name}</h2>
            <button type="button" onClick={() => markPassed(team.id)} disabled={!selectedRelayPointId}>Mark Passed</button>
          </div>
        ))}
      </div>
      <p>{message}</p>
    </main>
  );
}
