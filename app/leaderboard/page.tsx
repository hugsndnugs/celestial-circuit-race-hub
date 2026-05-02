"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/controller/datetime";
import { getLeaderboard } from "@/lib/controller/race-service";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subscribeRaceTables } from "@/lib/controller/realtime";
import type { LeaderboardRow } from "@/lib/controller/types";

function PublicLeaderboardInner() {
  const searchParams = useSearchParams();
  const raceCode = (searchParams.get("raceCode") ?? "").trim();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [message, setMessage] = useState("Provide race code to load leaderboard.");
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    if (!raceCode) {
      setRows([]);
      setMessage("Provide race code to load leaderboard.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const leaderboard = await getLeaderboard(raceCode);
      if (requestId !== fetchIdRef.current) return;
      setRows(leaderboard);
      setMessage(`Updated at ${formatDateTime(new Date().toISOString())}`);
    } catch {
      if (requestId !== fetchIdRef.current) return;
      setRows([]);
      setMessage("Leaderboard is currently unavailable.");
    } finally {
      if (requestId === fetchIdRef.current) setLoading(false);
    }
  }, [raceCode]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !raceCode) return;

    let cancelled = false;
    const channelRef: { current: RealtimeChannel | null } = { current: null };

    void (async () => {
      const { data: raceRow } = await supabase
        .from("races")
        .select("id")
        .or(`code.eq.${raceCode},id.eq.${raceCode}`)
        .maybeSingle();
      if (cancelled || !raceRow?.id) return;
      const channel = subscribeRaceTables(raceRow.id, () => void load(), ["relay_events"]);
      if (!channel) return;
      if (cancelled) {
        void supabase.removeChannel(channel);
        return;
      }
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [raceCode, load]);

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Race Leaderboard</h1>
        <p>
          Public standings for race code: <strong>{raceCode || "..."}</strong>
        </p>
        <p role="status" aria-live="polite">
          {loading ? "Loading standings…" : message}
        </p>
      </section>
      <section className="card">
        <h2>Standings</h2>
        {loading && rows.length === 0 ? (
          <p>Loading…</p>
        ) : rows.length === 0 ? (
          <p>No standings available yet.</p>
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
        <Link href="/status">Back to race status</Link>
      </section>
    </main>
  );
}

export default function PublicLeaderboardPage() {
  return (
    <Suspense
      fallback={
        <main className="page-stack">
          <section className="card">
            <p>Loading leaderboard…</p>
          </section>
        </main>
      }
    >
      <PublicLeaderboardInner />
    </Suspense>
  );
}
