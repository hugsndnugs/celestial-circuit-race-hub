"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/controller/datetime";
import { getLeaderboard } from "@/lib/controller/race-service";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import { type LeaderboardRow } from "@/lib/controller/types";

export default function LeaderboardPage() {
  const [raceRef, setRaceRef] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [message, setMessage] = useState("Provide race code and refresh leaderboard.");
  const fetchIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    try {
      const leaderboard = await getLeaderboard(raceRef);
      if (requestId !== fetchIdRef.current) return;
      setRows(leaderboard);
      setMessage(`Updated at ${formatDateTime(new Date().toISOString())}`);
    } catch {
      if (requestId !== fetchIdRef.current) return;
      setMessage("Failed to load leaderboard.");
    }
  }, [raceRef]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const trimmed = raceRef.trim();
    if (!supabase || !trimmed) return;

    let cancelled = false;
    const channelRef: { current: RealtimeChannel | null } = { current: null };

    void (async () => {
      const { data: raceRow } = await supabase
        .from("races")
        .select("id")
        .or(`code.eq.${trimmed},id.eq.${trimmed}`)
        .maybeSingle();
      if (cancelled || !raceRow?.id) return;
      const ch = supabase
        .channel(`leaderboard:${raceRow.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "relay_events", filter: `race_id=eq.${raceRow.id}` },
          () => {
            void refresh();
          },
        )
        .subscribe();
      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) void supabase.removeChannel(ch);
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
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
      </section>
      <section className="card">
        <h2>Standings</h2>
        {rows.length === 0 ? (
          <p>No standings yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col">Relay Points</th>
                <th scope="col">Elapsed (s)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.teamId}>
                  <td>{row.teamName}</td>
                  <td>{row.completedRelayPoints}</td>
                  <td>{row.elapsedSeconds ?? "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card" aria-live="polite">
        <output>{message}</output>
      </section>
    </main>
  );
}
