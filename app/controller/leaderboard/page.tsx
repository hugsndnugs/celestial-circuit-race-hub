"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/controller/datetime";
import { getLeaderboard } from "@/lib/controller/race-service";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import { type LeaderboardRow } from "@/lib/controller/types";

export default function LeaderboardPage() {
  const [raceRef, setRaceRef] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [message, setMessage] = useState("Provide race code and refresh leaderboard.");

  const refresh = useCallback(async () => {
    try {
      const leaderboard = await getLeaderboard(raceRef);
      setRows(leaderboard);
      setMessage(`Updated at ${formatDateTime(new Date().toISOString())}`);
    } catch {
      setMessage("Failed to load leaderboard.");
    }
  }, [raceRef]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !raceRef.trim()) return;
    const channel = supabase
      .channel(`leaderboard:${raceRef}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "relay_events" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [raceRef, refresh]);

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Leaderboard</h1>
        <p>View current standings by relay progress and elapsed time.</p>
      </section>
      <section className="card section-stack">
        <label htmlFor="leaderboardRaceId">Race Code</label>
        <input id="leaderboardRaceId" value={raceRef} onChange={(event) => setRaceRef(event.target.value)} placeholder="solar-fox-42" />
        <button type="button" onClick={refresh}>Refresh</button>
      </section>
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
      <section className="card">
        <p>{message}</p>
      </section>
    </main>
  );
}
