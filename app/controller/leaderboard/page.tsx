"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/controller/datetime";
import { getLeaderboard } from "@/lib/controller/race-service";
import { type LeaderboardRow } from "@/lib/controller/types";

export default function LeaderboardPage() {
  const [raceRef, setRaceRef] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [message, setMessage] = useState("Provide race code and refresh leaderboard.");

  async function refresh() {
    try {
      const leaderboard = await getLeaderboard(raceRef);
      setRows(leaderboard);
      setMessage(`Updated at ${formatDateTime(new Date().toISOString())}`);
    } catch {
      setMessage("Failed to load leaderboard.");
    }
  }

  return (
    <main>
      <h1>Leaderboard</h1>
      <div className="card">
        <label htmlFor="leaderboardRaceId">Race Code</label>
        <input id="leaderboardRaceId" value={raceRef} onChange={(event) => setRaceRef(event.target.value)} placeholder="solar-fox-42" />
        <button type="button" onClick={refresh}>Refresh</button>
      </div>
      <section className="card">
        <h2>Standings</h2>
        {rows.length === 0 ? (
          <p>No standings yet.</p>
        ) : (
          <ol>
            {rows.map((row) => (
              <li key={row.teamId}>
                {row.teamName} - relay points: {row.completedRelayPoints} - elapsed: {row.elapsedSeconds ?? "n/a"}s
              </li>
            ))}
          </ol>
        )}
      </section>
      <p>{message}</p>
    </main>
  );
}
