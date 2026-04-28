"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/controller/datetime";
import { getLeaderboard } from "@/lib/controller/race-service";
import type { LeaderboardRow } from "@/lib/controller/types";

export default function PublicLeaderboardPage() {
  const [raceCode] = useState(() => {
    if (typeof globalThis.location === "undefined") return "";
    return new URLSearchParams(globalThis.location.search).get("raceCode")?.trim() ?? "";
  });
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [message, setMessage] = useState("Provide race code to load leaderboard.");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!raceCode) {
        setRows([]);
        setMessage("Provide race code to load leaderboard.");
        return;
      }
      try {
        const leaderboard = await getLeaderboard(raceCode);
        if (cancelled) return;
        setRows(leaderboard);
        setMessage(`Updated at ${formatDateTime(new Date().toISOString())}`);
      } catch {
        if (cancelled) return;
        setRows([]);
        setMessage("Leaderboard is currently unavailable.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [raceCode]);

  const orderedRows = useMemo(() => rows, [rows]);

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Race Leaderboard</h1>
        <p>Public standings for race code: <strong>{raceCode || "..."}</strong></p>
        <p>{message}</p>
      </section>
      <section className="card">
        <h2>Standings</h2>
        {orderedRows.length === 0 ? (
          <p>No standings available yet.</p>
        ) : (
          <ol>
            {orderedRows.map((row) => (
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
